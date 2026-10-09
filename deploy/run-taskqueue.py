#!/usr/bin/env python3
"""Inject Task Queue credentials from the password book at startup."""
import hashlib,os
from pathlib import Path
import yaml
home=Path.home();book=yaml.safe_load((home/'.secrets/passwords.yml').read_text())
tokens=book['services']['task_queue']
runtime=Path(os.environ.get('XDG_RUNTIME_DIR','/run/user/1000'))/'cloudcli-taskqueue'
runtime.mkdir(mode=0o700,exist_ok=True);runtime.chmod(0o700)
token_file=runtime/'token'
fd=os.open(token_file,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
with os.fdopen(fd,'w') as f:f.write(tokens['cloudcli_token'])
token_file.chmod(0o600)
config=home/'.config/cloudcli-plugin-task-queue'
config.parent.mkdir(exist_ok=True)
if not config.exists():config.symlink_to(runtime,target_is_directory=True)
if config.resolve()!=runtime.resolve():raise RuntimeError('Task Queue token directory already configured elsewhere')
queue=home/'.claude/task-queue';queue.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();env.update({'MCP_HOST':'127.0.0.1','MCP_PORT':'8485','TASK_QUEUE_DIR':str(queue),'TASK_QUEUE_TOKEN_CODEX':tokens['codex_token'],'TASK_QUEUE_TOKEN_CLAUDE':tokens['claude_token'],'TASK_QUEUE_CLIENT_CLOUDCLI':'sha256:'+hashlib.sha256(tokens['cloudcli_token'].encode()).hexdigest(),'TASK_QUEUE_CLIENT_SCOPES_CLOUDCLI':'read,operator-write'})
os.chdir('/vol1/1000/deploy/data/MrTreasure/task-queue-mcp')
os.execve('/vol1/1000/appdata/cloudcli/taskqueue-venv/bin/python',['/vol1/1000/appdata/cloudcli/taskqueue-venv/bin/python','-m','src.server'],env)
