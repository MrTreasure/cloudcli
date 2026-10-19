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
