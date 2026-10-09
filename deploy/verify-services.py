#!/usr/bin/env python3
"""Probe deployed authentication, direct TLS, CORS, models, chat and terminal sockets."""
import json
from pathlib import Path
import socket
import time
import urllib.request
import urllib.error
import yaml
import websocket

credentials=yaml.safe_load((Path.home()/'.secrets/passwords.yml').read_text())['services']['cloudcli']
base='http://127.0.0.1:18803'
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def read(path, token=None, payload=None, method=None, headers=None, origin=base):
    headers=headers or {}
    if token:headers['Authorization']='Bearer '+token
    if payload is not None:headers['Content-Type']='application/json'
    request=urllib.request.Request(origin+path,data=None if payload is None else json.dumps(payload).encode(),headers=headers,method=method)
    with opener.open(request,timeout=30) as response:return response.status,response.headers,response.read()
_,_,body=read('/api/auth/login',payload={key:credentials[key] for key in ('username','password')})
token=json.loads(body)['token']
print('Login: OK')
for path in ['/health','/api/projects','/api/providers/codex/models','/api/providers/claude/models']:
    status,_,body=read(path,token=token)
    data=json.loads(body)
    if '/models' in path:print(path, status, ', '.join(item['value'] for item in data['data']['models']['OPTIONS']))
    else:print(path,status)
try:read('/api/projects')
except urllib.error.HTTPError as error:
    assert error.code==401
    print('Unauthenticated API: 401')
else:raise RuntimeError('Unauthenticated API must reject access')

original_getaddrinfo=socket.getaddrinfo
def local_direct_host(host, port, *args, **kwargs):
    return original_getaddrinfo('::1' if host=='agent-api-nas.mrtreasure.cc' else host,port,*args,**kwargs)
socket.getaddrinfo=local_direct_host
origin='https://agent-api-nas.mrtreasure.cc:15432'
status,headers,_=read('/health',origin=origin)
assert status==200 and not headers.get('cf-ray')
print('Direct HTTPS with certificate verification: 200, no CF')
status,headers,_=read('/api/projects',method='OPTIONS',origin=origin,headers={'Origin':'https://agent.mrtreasure.cc','Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'})
assert status==204 and headers.get('Access-Control-Allow-Origin')=='https://agent.mrtreasure.cc'
print('CORS preflight: 204')
for path in ['/ws','/shell']:
    connection=websocket.create_connection('wss://agent-api-nas.mrtreasure.cc:15432'+path+'?token='+token,origin='https://agent.mrtreasure.cc',timeout=15,http_no_proxy=['agent-api-nas.mrtreasure.cc'])
    print(path,'TLS WebSocket: 101')
    if path=='/shell':
        connection.send(json.dumps({'type':'init','projectPath':'/vol1/1000/deploy/data/MrTreasure/cloudcli','sessionId':None,'hasSession':False,'provider':'plain-shell','isPlainShell':True,'cols':80,'rows':24,'initialCommand':'printf CLOUDCLI_PTY_OK','forceRestart':True}))
        deadline=time.monotonic()+15
        while time.monotonic()<deadline:
            message=json.loads(connection.recv())
            if message.get('type')=='error':raise RuntimeError('Terminal rejected initialization: '+message.get('message',''))
            if 'CLOUDCLI_PTY_OK' in message.get('data',''):break
        else:raise RuntimeError('Terminal output missing')
        print('Terminal PTY: OK')
    connection.close()
