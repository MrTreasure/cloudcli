import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { CODEX_PREDEFINED_MODELS } from '@/modules/providers/list/codex/codex-models.provider.js';



const findCodexModel = (value: string) =>
  CODEX_PREDEFINED_MODELS.OPTIONS.find((option) => option.value === value);

test('lists GPT-6 Sol and GPT-6 Luna with the effort levels the Codex CLI accepts', () => {
  const sol = findCodexModel('gpt-6-sol');
  assert.equal(sol?.label, 'GPT-6 Sol');
  assert.equal(sol?.effort?.default, 'medium');
  assert.deepEqual(
    sol?.effort?.values.map((effort) => effort.value),
    ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
  );

  const luna = findCodexModel('gpt-6-luna');
  assert.equal(luna?.label, 'GPT-6 Luna');
  assert.equal(luna?.effort?.default, 'medium');
  assert.deepEqual(
    luna?.effort?.values.map((effort) => effort.value),
    ['low', 'medium', 'high', 'xhigh', 'max'],
  );
});

test('uses a Codex SDK new enough for the configured models and Fast tier', () => {
  // Codex only ships metadata for gpt-6-sol / gpt-6-luna from 0.155.0 on. An
  // older CLI still sends the request, but on fallback metadata: it warns
  // "Model metadata ... not found" and quietly drops `ultra` to `medium`.
  // The CLI is supplied by each host; the application pins the SDK only.
  const sdkPackage = resolve(dirname(fileURLToPath(import.meta.resolve('@openai/codex-sdk'))), '../package.json');
  const { version } = JSON.parse(readFileSync(sdkPackage, 'utf8')) as { version: string };
  const [major, minor] = version.split('.').map(Number);
  assert.ok(major > 0 || minor >= 162, `@openai/codex-sdk ${version} predates Fast support`);
});

test('gateway discovery coalesces requests, refreshes additions and retains the last good catalog on failure', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { CodexProviderModels } = await import('@/modules/providers/list/codex/codex-models.provider.js');
  const directory = await mkdtemp(resolve(tmpdir(), 'codex-model-discovery-'));
  const configPath = resolve(directory, 'config.toml');
  let now = 1;
  let calls = 0;
  let fail = false;
  let ids = ['gpt-6.1-terra', 'gpt-image-2', 'claude-test', 'gpt-6-astra', 'gpt-6.1-terra'];
  const mockFetch: typeof fetch = async (url, init) => {
    calls += 1;
    assert.equal(String(url), 'http://127.0.0.1:12345/v1/models?client_version=cpa');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer mock-model-key');
    assert.equal(init?.redirect, 'error');
    if (fail) throw new Error('simulated failure');
    return Response.json({ data: ids.map((id) => ({ id })) });
  };
  try {
    await writeFile(configPath, 'model_provider = "gateway"\n[model_providers.gateway]\nbase_url = "http://127.0.0.1:12345/v1/"\nexperimental_bearer_token = "mock-model-key"\n');
    const adapter = new CodexProviderModels({ configPath, fetch: mockFetch, now: () => now });
    const catalogs = await Promise.all([adapter.getSupportedModels(), adapter.getSupportedModels()]);
    assert.equal(calls, 1);
    assert.equal(catalogs[0].OPTIONS.filter((m) => m.value === 'gpt-6.1-terra').length, 1);
    assert.equal(catalogs[0].OPTIONS.find((m) => m.value === 'gpt-6.1-terra')?.effort, undefined);
    assert.ok(!catalogs[0].OPTIONS.some((m) => m.value === 'gpt-image-2'));
    assert.ok(!catalogs[0].OPTIONS.some((m) => m.value === 'claude-test'));
    assert.equal(catalogs[0].DEFAULT, CODEX_PREDEFINED_MODELS.DEFAULT);
    assert.deepEqual(catalogs[0].OPTIONS.find((m) => m.value === 'gpt-6-astra')?.effort, findCodexModel('gpt-6-astra')?.effort);
    ids.push('gpt-6.2-test');
    await adapter.getSupportedModels();
    assert.equal(calls, 1);
    now += 60_001;
    const refreshed = await adapter.getSupportedModels();
    assert.ok(refreshed.OPTIONS.some((m) => m.value === 'gpt-6.2-test'));
    fail = true;
    now += 60_001;
    assert.deepEqual(await adapter.getSupportedModels(), refreshed);
    await adapter.getSupportedModels();
    assert.equal(calls, 3);
    fail = false;
    now += 30_001;
    await adapter.getSupportedModels();
    assert.equal(calls, 4);
    // An endpoint/identity change cannot reuse the previous gateway's models.
    await writeFile(configPath, 'model_provider = "gateway"\n[model_providers.gateway]\nbase_url = "http://127.0.0.1:12345/v1"\nexperimental_bearer_token = "changed-mock-key"\n');
    assert.deepEqual(await adapter.getSupportedModels(), CODEX_PREDEFINED_MODELS);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('standard installs and invalid catalogs safely fall back', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { CodexProviderModels } = await import('@/modules/providers/list/codex/codex-models.provider.js');
  const directory = await mkdtemp(resolve(tmpdir(), 'codex-model-fallback-'));
  const configPath = resolve(directory, 'config.toml');
  let calls = 0;
  try {
    await writeFile(configPath, 'model = "gpt-6-sol"\n');
    const adapter = new CodexProviderModels({ configPath, fetch: async () => { calls++; return Response.json({}); } });
    assert.deepEqual(await adapter.getSupportedModels(), CODEX_PREDEFINED_MODELS);
    assert.equal(calls, 0);
    await writeFile(configPath, 'model_provider = "gateway"\n[model_providers.gateway]\nbase_url = "http://127.0.0.1:12345/v1"\n');
    assert.deepEqual(await adapter.getSupportedModels(), CODEX_PREDEFINED_MODELS);
    assert.equal(calls, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


test('Codex catalog supplies Terra reasoning levels and hides internal models', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { CodexProviderModels } = await import('@/modules/providers/list/codex/codex-models.provider.js');
  const directory = await mkdtemp(resolve(tmpdir(), 'codex-model-effort-'));
  const configPath = resolve(directory, 'config.toml');
  try {
    await writeFile(configPath, 'model_provider="gateway"\n[model_providers.gateway]\nbase_url="http://127.0.0.1:12345/v1"\n');
    const adapter = new CodexProviderModels({ configPath, fetch: async () => Response.json({ models: [
      { slug: 'gpt-6.1-terra', display_name: 'GPT 6.1 Terra', default_reasoning_level: 'low',
        supported_reasoning_levels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra', 'unsupported'].map((effort) => ({ effort })) },
      { slug: 'gpt-hidden-test', visibility: 'hide' },
    ] }) });
    const catalog = await adapter.getSupportedModels();
    const terra = catalog.OPTIONS.find((m) => m.value === 'gpt-6.1-terra');
    assert.equal(terra?.label, 'GPT 6.1 Terra');
    assert.equal(terra?.effort?.default, 'low');
    assert.deepEqual(terra?.effort?.values.map((v) => v.value), ['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
    assert.ok(!catalog.OPTIONS.some((m) => m.value === 'gpt-hidden-test'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
