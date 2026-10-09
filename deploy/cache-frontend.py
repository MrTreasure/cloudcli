#!/usr/bin/env python3
"""Cache only the public HTML entry at the edge and purge it after a release."""
from datetime import datetime
import json
from pathlib import Path
import sys
import urllib.request
import yaml

credentials = yaml.safe_load((Path.home() / '.secrets/passwords.yml').read_text())['cloudflare']
zone = credentials['zone_id']
headers = {'X-Auth-Email': credentials['email'], 'X-Auth-Key': credentials['global_api_key'], 'Content-Type': 'application/json'}
def request(method, path, body=None):
    req = urllib.request.Request('https://api.cloudflare.com/client/v4/' + path, method=method,
        data=None if body is None else json.dumps(body).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response: result = json.load(response)
    if not result['success']: raise RuntimeError('Cloudflare cache operation failed')
    return result['result']

ruleset = request('GET', f'zones/{zone}/rulesets/phases/http_request_cache_settings/entrypoint')
rule = {
    'ref': 'cloudcli_public_html', 'description': 'CloudCLI public HTML shell, 30 seconds',
    'expression': '(http.host eq "agent.mrtreasure.cc" and http.request.uri.path in {"/" "/index.html"} and http.request.method in {"GET" "HEAD"})',
    'action': 'set_cache_settings', 'action_parameters': {'cache': True, 'edge_ttl': {'mode': 'override_origin', 'default': 30}}, 'enabled': True,
}
existing = next((item for item in ruleset['rules'] if item.get('ref') == rule['ref']), None)
if existing is None or any(existing.get(key) != value for key, value in rule.items()):
    backup = Path('/vol1/1000/appdata/cloudcli/backups') / datetime.now().strftime('%Y%m%d-%H%M%S')
    backup.mkdir(parents=True, exist_ok=True)
    (backup / 'html-cache.before.json').write_text(json.dumps(ruleset, indent=2))
    if existing:
        request('PATCH', f"zones/{zone}/rulesets/{ruleset['id']}/rules/{existing['id']}", rule)
    else:
        request('POST', f"zones/{zone}/rulesets/{ruleset['id']}/rules", rule)
files = ['https://agent.mrtreasure.cc/', 'https://agent.mrtreasure.cc/index.html']
for url in sys.argv[1:]:
    if not url.startswith('https://assets.mrtreasure.cc/cloudcli/v1/assets/'):
        raise ValueError('Static cache purge must remain within CloudCLI assets')
    # Purge both the ordinary cache key and its browser Origin variant.
    files.extend([url, {'url': url, 'headers': {'Origin': 'https://agent.mrtreasure.cc'}}])
request('POST', f'zones/{zone}/purge_cache', {'files': files})
print('Public HTML edge cache: 30 seconds; entry URLs purged')
