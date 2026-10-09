#!/usr/bin/env python3
"""Complete missing Chinese UI resources with DeepSeek; preserve interpolation tokens."""
import concurrent.futures
import json
import re
import time
import urllib.request
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
LOCALES = ROOT / 'src/modules/i18n/locales'
CACHE = Path('/vol1/1000/appdata/cloudcli/localization')
CACHE.mkdir(parents=True, exist_ok=True)
book = yaml.safe_load((Path.home() / '.secrets/passwords.yml').read_text())
provider = book['llm_providers']['deepseek']

def flatten(value, prefix=''):
    result = {}
    for key, item in value.items():
        full = f'{prefix}.{key}' if prefix else key
        if isinstance(item, dict): result.update(flatten(item, full))
        elif isinstance(item, str): result[full] = item
    return result

def tokens(value):
    return sorted(re.findall(r'\{\{.*?\}\}|\$ARGUMENTS|</?[A-Za-z][^>]*>', value))

pending = {}
resources = {}
for source in sorted((LOCALES / 'en').glob('*.json')):
    target = LOCALES / 'zh-CN' / source.name
    resources[source.stem] = json.loads(target.read_text()) if target.exists() else {}
    existing = flatten(resources[source.stem])
    for key, value in flatten(json.loads(source.read_text())).items():
        old = existing.get(key)
        if old is None or (old == value and re.search(r'[a-z]{3}', value) and not re.fullmatch(r'(CloudCLI|DeepSeek.*|Claude.*|Codex|GitHub|OpenCode|Cursor|.*\.json|https?://\S+|.+@.+)', value)):
            pending[f'{source.stem}:{key}'] = value

items = list(pending.items())
batches = [dict(items[n:n+60]) for n in range(0, len(items), 60)]
print(f'Translating {len(items)} labels in {len(batches)} batches', flush=True)

def translate(batch):
    import hashlib
    cache = CACHE / (hashlib.sha256(json.dumps(batch, sort_keys=True).encode()).hexdigest() + '.json')
    if cache.exists(): return json.loads(cache.read_text())
    payload = {'model': 'deepseek-flash', 'thinking': {'type': 'disabled'}, 'temperature': 0,
      'response_format': {'type': 'json_object'}, 'max_tokens': 14000,
      'messages': [{'role': 'system', 'content': '你是专业软件汉化编辑。将 JSON 中每个字符串翻译为简洁、准确、自然的简体中文，应用是管理编程智能体的 CloudCLI。保持键完全不变。必须原样保留 {{变量}}、HTML标签、路径、命令、快捷键、模型名称、CloudCLI、Claude、Codex、Cursor、OpenCode、MCP、API、Git 等技术名词。只返回同样键集合的 JSON 对象。不要遗漏字段，不添加解释。'},
                   {'role': 'user', 'content': json.dumps(batch, ensure_ascii=False)}]}
    for attempt in range(3):
        try:
            req = urllib.request.Request(provider['api_base'].rstrip('/') + '/chat/completions', data=json.dumps(payload).encode(), headers={'Authorization': 'Bearer ' + provider['api_key'], 'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=180) as response: data=json.load(response)
            result=json.loads(data['choices'][0]['message']['content'])
            if set(result) != set(batch):
                if len(result) == 1 and isinstance(next(iter(result.values())), dict): result=next(iter(result.values()))
                if set(result) != set(batch):
                    raise ValueError('Translation keys differ; missing='+repr(sorted(set(batch)-set(result))[:4])+'; extra='+repr(sorted(set(result)-set(batch))[:4]))
            for key, value in result.items():
                if not isinstance(value, str) or tokens(value) != tokens(batch[key]): raise ValueError('Interpolation differs: ' + key)
            cache.write_text(json.dumps(result, ensure_ascii=False, indent=2))
            print(f'Completed {len(result)} labels', flush=True)
            return result
        except Exception as error:
            print('Batch retry:', type(error).__name__, str(error) if isinstance(error, ValueError) else 'request error', flush=True)
            if isinstance(error, ValueError):
                payload['messages'].append({'role':'user','content':'上次结果校验失败：'+str(error)+'。请重新返回整个 JSON，必须完全保持所有 {{变量}} 与 <尖括号内容> 原样。'})
            if attempt == 2: raise RuntimeError(f'Translation failed: {type(error).__name__}') from None
            time.sleep(2)

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(translate, batches):
        for full, value in result.items():
            namespace, key = full.split(':', 1)
            parent = resources[namespace]
            segments=key.split('.')
            for segment in segments[:-1]: parent=parent.setdefault(segment, {})
            parent[segments[-1]]=value
for namespace, value in resources.items():
    (LOCALES / 'zh-CN' / (namespace + '.json')).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
print('Chinese resources saved', flush=True)
