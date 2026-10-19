#!/usr/bin/env python3
"""Run the compiled NAS backend with credentials read at process startup."""
import os
from pathlib import Path

import yaml

root = Path(__file__).resolve().parent.parent
home = Path.home()
book_path = home / '.secrets/passwords.yml'
book = yaml.safe_load(book_path.read_text())
provider = book['llm_providers']['deepseek']
environment = os.environ.copy()
environment.update({
    'NODE_ENV': 'production',
    'HOME': str(home),
    'HOST': '127.0.0.1',
    'SERVER_PORT': '18803',
    'FRONTEND_ORIGIN': 'https://agent.mrtreasure.cc',
    'API_KEY': book['services']['cloudcli']['agent_api_key'],
    'ANTHROPIC_BASE_URL': provider['anthropic_base'],
    'ANTHROPIC_AUTH_TOKEN': provider['api_key'],
    'ANTHROPIC_MODEL': 'deepseek-v4-pro',
    'ANTHROPIC_DEFAULT_OPUS_MODEL': 'deepseek-v4-pro',
    'ANTHROPIC_DEFAULT_SONNET_MODEL': 'deepseek-v4-pro',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL': 'deepseek-flash',
    'DATABASE_PATH': str(home / '.cloudcli/auth.db'),
    'CODEX_HOME': str(home / '.codex'),
    'CODEX_CLI_PATH': '/vol1/pnpm/bin/codex',
    'PASSWORD_BOOK': str(book_path),
    'WORKSPACES_ROOT': '/',
    'CLOUDCLI_ORIGIN': 'https://agent.mrtreasure.cc',
    'PATH': str(root / 'node_modules/.bin') + os.pathsep + environment.get('PATH', os.defpath),
})
os.chdir(root)
# Replace the launcher so systemd tracks Node and signals it directly.
os.execvpe('node', ['node', str(root / 'dist-server/server/index.js')], environment)
