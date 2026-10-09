#!/usr/bin/env python3
"""Initialize the local CloudCLI user before publishing its network entry."""
import json
from pathlib import Path
import time
import urllib.request

import yaml

credentials = yaml.safe_load((Path.home() / '.secrets/passwords.yml').read_text())['services']['cloudcli']
base = 'http://127.0.0.1:18803'
for attempt in range(30):
    try:
        with urllib.request.urlopen(base + '/api/auth/status', timeout=5) as response:
            status = json.load(response)
        break
    except OSError:
        if attempt == 29:
            raise
        time.sleep(1)
if status.get('needsSetup'):
    payload = json.dumps({key: credentials[key] for key in ('username', 'password')}).encode()
    request = urllib.request.Request(base + '/api/auth/register', data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=15) as response:
        result = json.load(response)
    if not result.get('success'):
        raise RuntimeError('User initialization failed')
    print('CloudCLI user initialized; password remains in services.cloudcli.password')
else:
    print('CloudCLI user already configured; credentials unchanged')
