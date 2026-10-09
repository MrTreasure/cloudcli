#!/usr/bin/env python3
"""Local stdio MCP bridge; resolve the agent's token from the canonical book."""
import sys
from pathlib import Path
import yaml
from fastmcp.server import create_proxy
from fastmcp.client.transports import StreamableHttpTransport
agent=sys.argv[1]
if agent not in ('codex','claude'):raise SystemExit('Expected codex or claude')
book=yaml.safe_load((Path.home()/'.secrets/passwords.yml').read_text())
transport=StreamableHttpTransport('http://127.0.0.1:8485/mcp',headers={'Authorization':'Bearer '+book['services']['task_queue'][agent+'_token']})
create_proxy(transport,name='task-queue').run(transport='stdio',show_banner=False)
