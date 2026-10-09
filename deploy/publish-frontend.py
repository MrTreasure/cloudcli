#!/usr/bin/env python3
"""Build on NAS and atomically publish static files without touching Docker."""
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent.parent
environment = os.environ.copy()
environment['VITE_API_ORIGIN'] = 'https://agent-api-nas.mrtreasure.cc:15432'
subprocess.run(['pnpm', 'run', 'build:client'], cwd=root, env=environment, check=True)
destination = Path('/vol1/1000/nginx/public/cloudcli')
destination.mkdir(parents=True, exist_ok=True)
destination.chmod(0o755)
# Keep older hashed assets for clients that still have an earlier page open.
subprocess.run([
    'rsync', '-a', '--chmod=D755,F644', '--exclude=index.html',
    str(root / 'dist') + '/', str(destination) + '/',
], check=True)
temporary = destination / '.index.next.html'
temporary.write_bytes((root / 'dist/index.html').read_bytes())
temporary.chmod(0o644)
os.replace(temporary, destination / 'index.html')
print('Frontend published; Docker backend unchanged')
