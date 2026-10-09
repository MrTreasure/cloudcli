#!/usr/bin/env python3
"""Run Docker Compose with credentials injected from the host password book."""
import os
from pathlib import Path
import subprocess
import sys

import yaml

# fnOS can inherit restrictive permissions in appdata; set ownership-user access explicitly.
for runtime_directory in ('', 'cloudcli', 'claude', 'plugins'):
    directory = Path('/vol1/1000/appdata/cloudcli') / runtime_directory
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    directory.chmod(0o700)

# Keep CloudCLI data on the data volume while sharing the complete host home.
for home_entry, runtime_entry in (('.cloudcli', 'cloudcli'), ('.claude-code-ui', 'plugins')):
    link = Path('/home/Treasure') / home_entry
    if not link.exists() and not link.is_symlink():
        link.symlink_to(Path('/vol1/1000/appdata/cloudcli') / runtime_entry, target_is_directory=True)

book = yaml.safe_load((Path.home() / '.secrets/passwords.yml').read_text())
environment = os.environ.copy()
environment['CLOUDCLI_AGENT_API_KEY'] = book['services']['cloudcli']['agent_api_key']
environment['CLOUDCLI_DEEPSEEK_BASE'] = book['llm_providers']['deepseek']['anthropic_base']
environment['CLOUDCLI_DEEPSEEK_KEY'] = book['llm_providers']['deepseek']['api_key']
result = subprocess.run(
    ['docker', 'compose', *sys.argv[1:]],
    cwd=Path(__file__).resolve().parent.parent,
    env=environment,
)
sys.exit(result.returncode)
