import assert from 'node:assert/strict';
import test from 'node:test';
import { readClaudeContextUsage } from '@/modules/providers/services/provider-context-usage.service.js';

test('uses the native summary occupancy and resolved window without category API calls', async () => {
  const result = await readClaudeContextUsage({ getContextUsage: async (options) => {
    assert.equal(options.detail, 'summary');
    return { totalTokens: 75000, rawMaxTokens: 1000000, maxTokens: 950000 };
  } });
  assert.deepEqual(result, { used: 75000, total: 1000000 });
});

test('unsupported and malformed context reports leave the assistant reading intact', async () => {
  assert.equal(await readClaudeContextUsage({}), null);
  assert.equal(await readClaudeContextUsage({ getContextUsage: async () => { throw new Error('unsupported'); } }), null);
  assert.equal(await readClaudeContextUsage({ getContextUsage: async () => ({ totalTokens: 'invalid', rawMaxTokens: 0 }) }), null);
});
