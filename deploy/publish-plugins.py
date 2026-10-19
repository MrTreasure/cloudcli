#!/usr/bin/env python3
"""Build and publish maintained plugin source to the native plugin host."""
from pathlib import Path
import os,shutil,subprocess
root=Path(__file__).resolve().parent.parent
runtime=Path.home()/'.claude-code-ui/plugins'
for source in sorted((root/'local-plugins').iterdir()):
 # Removed plugins may leave ignored build caches after a branch switch.
 if not source.is_dir() or not (source/'package.json').is_file() or not (source/'manifest.json').is_file():continue
 subprocess.run(['pnpm','run','build'],cwd=source,check=True)
 target=runtime/source.name
 if not target.is_dir():raise RuntimeError('Install plugin before publishing: '+source.name)
 temporary=target/'dist.next';shutil.rmtree(temporary,ignore_errors=True);shutil.copytree(source/'dist',temporary)
 previous=target/'dist.previous';shutil.rmtree(previous,ignore_errors=True)
 if (target/'dist').exists():os.replace(target/'dist',previous)
 os.replace(temporary,target/'dist');shutil.copy2(source/'manifest.json',target/'manifest.json')
 print('Published',source.name)
print('Restart cloudcli-backend to reload plugin workers.')
