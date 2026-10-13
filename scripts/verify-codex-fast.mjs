import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { Codex } from '@openai/codex-sdk';
// Isolated protocol verification: temporary CLI home and loopback mock upstream only.
// Optional --cpa-binary /path/to/CLIProxyAPI adds an isolated CPA filter matrix.
const executable = process.env.CODEX_EXECUTABLE || 'codex';
const cpaIndex = process.argv.indexOf('--cpa-binary');
const cpaBinary = cpaIndex >= 0 ? process.argv[cpaIndex + 1] : null;
const home = await mkdtemp(path.join(tmpdir(),'cloudcli-fast-wire-'));
const captured=[];
const server=http.createServer(async(req,res)=>{
 let raw=''; for await(const c of req)raw+=c;
 if(req.url?.endsWith('/responses')){
 const body=JSON.parse(raw);captured.push({model:body.model,tier:body.service_tier});
 res.writeHead(200,{'Content-Type':'text/event-stream'});
 const response={id:'resp_test',object:'response',created_at:1,status:'completed',model:body.model,output:[],usage:{input_tokens:1,output_tokens:1,total_tokens:2}};
 res.end(`event: response.completed\ndata: ${JSON.stringify({type:'response.completed',response})}\n\n`);
 }else{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({models:[],data:[]}));}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
await writeFile(path.join(home,'config.toml'),`model = "gpt-6.1-sol"\nmodel_provider = "wire_test"\nservice_tier = "priority"\n[model_providers.wire_test]\nname = "Wire Test"\nbase_url = "http://127.0.0.1:${server.address().port}/v1"\nwire_api = "responses"\nrequires_openai_auth = false\nrequest_max_retries = 0\nstream_max_retries = 0\n`);
const app=spawn(executable,['app-server'],{env:{...process.env,CODEX_HOME:home},stdio:['pipe','pipe','pipe']});
let next=0;const pending=new Map();const notifications=[];
createInterface({input:app.stdout}).on('line',line=>{try{const m=JSON.parse(line);if(m.id!=null){pending.get(m.id)?.(m);pending.delete(m.id);}else notifications.push(m);}catch{}});
let errors='';app.stderr.on('data',c=>{errors+=c;});
async function rpc(method,params){const id=++next;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(`Timeout ${method}: ${errors.slice(-1000)}`)),15000);pending.set(id,m=>{clearTimeout(timer);if(m.error)reject(Error(JSON.stringify(m.error)));else resolve(m.result)});app.stdin.write(JSON.stringify({id,method,params})+'\n')});}
async function waitForRequests(count){const start=Date.now();while(captured.length<count){if(Date.now()-start>15000)throw Error('No request: '+errors.slice(-1200));await new Promise(r=>setTimeout(r,20));}}
try{
 await rpc('initialize',{clientInfo:{name:'cloudcli_wire_test',version:'1'},capabilities:{experimentalApi:true}});
 app.stdin.write(JSON.stringify({method:'initialized'})+'\n');
 const t=await rpc('thread/start',{cwd:home,model:'gpt-6.1-sol',approvalPolicy:'never',sandbox:'read-only',serviceTier:'priority'});
 const threadId=t.thread.id;
 for(const tier of ['priority','default']){
  if(tier==='default') await rpc('thread/resume',{threadId,cwd:home,model:'gpt-6.1-sol',serviceTier:tier});
  await rpc('turn/start',{threadId,input:[{type:'text',text:'Return no text.'}],serviceTier:tier,serviceTierForTurn:tier});
  await waitForRequests(tier==='priority'?1:2);
  const start=Date.now();while(!notifications.some(n=>n.method==='turn/completed')){if(Date.now()-start>15000)throw Error('No complete');await new Promise(r=>setTimeout(r,20));}
  notifications.length=0;
 }
 let sdkThreadId;
 for(const tier of ['priority','default']){
  const sdk=new Codex({codexPathOverride:executable,env:{...process.env,CODEX_HOME:home},config:{service_tier:tier}});
  const options={model:'gpt-6.1-sol',workingDirectory:home,skipGitRepoCheck:true,approvalPolicy:'never',sandboxMode:'read-only'};
  const thread=tier==='priority'?sdk.startThread(options):sdk.resumeThread(sdkThreadId,options);
  const stream=await thread.runStreamed('Return no text.');for await(const event of stream.events){if(event.type==='thread.started')sdkThreadId=event.thread_id;}
 }
 console.log(JSON.stringify(captured));
 if(captured.length!==4 || captured[0].tier!=='priority' || captured[1].tier==='priority' || captured[2].tier!=='priority' || captured[3].tier==='priority')throw Error('Tier mismatch');
 console.log('Actual CLI wire validation passed: app-server start/resume and SDK start/resume; inherited global priority is cleared when off.');
 if(cpaBinary) {
  const snapshots = captured.slice();
  for(const [state,blocked] of [['master-off',true],['quota-low',true],['quota-unknown',true],['quota-restored',false]]) {
   const reserve = http.createServer();
   await new Promise(r=>reserve.listen(0,'127.0.0.1',r));
   const port = reserve.address().port;
   await new Promise(r=>reserve.close(r));
   const configPath=path.join(home,`cpa-${state}.yaml`);
   await writeFile(configPath,`host: "127.0.0.1"\nport: ${port}\nauth-dir: "${home}/auth"\napi-keys: ["fixture-client"]\nremote-management:\n  secret-key: ""\n  disable-control-panel: true\n  disable-auto-update-panel: true\nrequest-retry: 0\ncodex-api-key:\n  - api-key: "fixture-upstream"\n    base-url: "http://127.0.0.1:${server.address().port}/v1"\n    models:\n      - name: "gpt-6.1-sol"\n        alias: "gpt-6.1-sol"\n${blocked?'payload:\n  filter:\n    - models:\n        - name: "*"\n          protocol: "codex"\n      params: ["service_tier"]\n':''}`);
   const cpa=spawn(cpaBinary,['-config',configPath],{cwd:home,stdio:['ignore','pipe','pipe']});
   let cpaLog='';cpa.stdout.on('data',c=>{cpaLog+=c;});cpa.stderr.on('data',c=>{cpaLog+=c;});
   try{
    let ready=false;
    for(let attempt=0;attempt<100;attempt++){
     try{const response=await fetch(`http://127.0.0.1:${port}/v1/models`,{headers:{Authorization:'Bearer fixture-client'}});await response.body?.cancel();if(response.ok){ready=true;break;}}catch{}
     await new Promise(r=>setTimeout(r,50));
    }
    if(!ready)throw Error('Isolated CPA did not start: '+cpaLog.slice(-1000));
    for(const snapshot of snapshots){
     const before=captured.length;
     const response=await fetch(`http://127.0.0.1:${port}/v1/responses`,{
      method:'POST',headers:{Authorization:'Bearer fixture-client','Content-Type':'application/json'},
      body:JSON.stringify({model:snapshot.model,input:[{role:'user',content:'fixture'}],stream:true,...(snapshot.tier?{service_tier:snapshot.tier}:{})}),
     });
     await response.text();
     if(!response.ok || captured.length!==before+1)throw Error(`CPA ${state} failed: HTTP ${response.status}; ${cpaLog.slice(-500)}`);
     const actual=captured.at(-1);
     if(actual.tier!==(blocked?undefined:snapshot.tier))throw Error(`CPA ${state} tier mismatch: ${JSON.stringify(actual)}`);
    }
    console.log(`CPA ${state}: app-server/SDK on/off wire snapshots validated; priority ${blocked?'stripped':'permitted'}, standard remains standard.`);
   }finally{cpa.kill();await new Promise(r=>{if(cpa.exitCode!==null)r();else cpa.once('exit',r);});}
  }
 }

}finally{app.kill();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(home,{recursive:true,force:true});}
