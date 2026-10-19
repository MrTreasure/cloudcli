#!/usr/bin/env python3
"""Publish CloudCLI frontend tunnel, DNS and hashed-asset cache rule."""
from datetime import datetime
import json
from pathlib import Path
import urllib.error
import urllib.request

import yaml

credentials = yaml.safe_load((Path.home() / '.secrets/passwords.yml').read_text())['cloudflare']
headers = {
    'X-Auth-Email': credentials['email'],
    'X-Auth-Key': credentials['global_api_key'],
    'Content-Type': 'application/json',
}
zone = credentials['zone_id']
backup = Path('/vol1/1000/appdata/cloudcli/backups') / datetime.now().strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True, exist_ok=True)


def request(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request('https://api.cloudflare.com/client/v4/' + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.load(response)
    if not payload['success']:
        raise RuntimeError(payload.get('errors'))
    return payload['result']


records = request('GET', f'zones/{zone}/dns_records?per_page=100')
orbit = next(item for item in records if item['name'] == 'orbit.mrtreasure.cc')
tunnel = orbit['content'].removesuffix('.cfargotunnel.com')
tunnel_path = f"accounts/{credentials['account_id']}/cfd_tunnel/{tunnel}/configurations"
config = request('GET', tunnel_path)['config']
(backup / 'tunnel.json').write_text(json.dumps(config, indent=2))
ingress = config['ingress']
if not any(item.get('hostname') == 'agent.mrtreasure.cc' for item in ingress):
    ingress.insert(len(ingress) - 1, {'hostname': 'agent.mrtreasure.cc', 'service': 'http://127.0.0.1:17843'})
else:
    for item in ingress:
        if item.get('hostname') == 'agent.mrtreasure.cc':
            item['service'] = 'http://127.0.0.1:17843'
request('PUT', tunnel_path, {'config': config})

for name, content, proxied in [
    ('agent.mrtreasure.cc', orbit['content'], True),
    ('agent-api-nas.mrtreasure.cc', 'cpa.mrtreasure.cc', False),
]:
    body = {'type': 'CNAME', 'name': name, 'content': content, 'proxied': proxied, 'ttl': 1}
    existing = next((item for item in records if item['name'] == name), None)
    if existing:
        (backup / (name + '.json')).write_text(json.dumps(existing, indent=2))
        request('PUT', f"zones/{zone}/dns_records/{existing['id']}", body)
    else:
        request('POST', f'zones/{zone}/dns_records', body)
    print(name, 'CF proxy' if proxied else 'DNS only')

phase_path = f'zones/{zone}/rulesets/phases/http_request_cache_settings/entrypoint'
try:
    ruleset = request('GET', phase_path)
except urllib.error.HTTPError as error:
    if error.code != 404:
        raise
    ruleset = None
rule = {
    'ref': 'cloudcli_hashed_assets',
    'description': 'CloudCLI hashed frontend assets',
    'expression': '(http.host eq "agent.mrtreasure.cc" and starts_with(http.request.uri.path, "/assets/"))',
    'action': 'set_cache_settings',
    'action_parameters': {'cache': True, 'edge_ttl': {'mode': 'respect_origin'}},
    'enabled': True,
}
if ruleset:
    (backup / 'cache-ruleset.json').write_text(json.dumps(ruleset, indent=2))
    existing = next((item for item in ruleset.get('rules', []) if item.get('ref') == rule['ref']), None)
    if existing:
        request('PATCH', f"zones/{zone}/rulesets/{ruleset['id']}/rules/{existing['id']}", rule)
    else:
        request('POST', f"zones/{zone}/rulesets/{ruleset['id']}/rules", rule)
else:
    request('POST', f'zones/{zone}/rulesets', {
        'name': 'Frontend asset cache', 'kind': 'zone',
        'phase': 'http_request_cache_settings', 'rules': [rule],
    })
print('Hashed-asset cache configured; previous configuration saved in', backup)
