import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readCodexContextLimits } from '@/modules/providers/services/codex-context-limits.service.js';

test('configured Codex window respects the model cap and reports both compaction thresholds', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'codex-limits-'));
  try {
    await writeFile(path.join(home, 'config.toml'), [
      'model = "test-model"',
      'model_context_window = 524288',
      'model_auto_compact_token_limit = 480000',
      'model_post_turn_compact_threshold_percent = 80',
    ].join('\n'));
    await writeFile(path.join(home, 'models_cache.json'), JSON.stringify({ models: [{
      slug: 'test-model', context_window: 272000, max_context_window: 512000,
      effective_context_window_percent: 95,
    }] }));

    assert.deepEqual(readCodexContextLimits('test-model', home), {
      configuredContextWindow: 512000,
      usableContextWindow: 486400,
      autoCompactThreshold: 460800,
      postTurnCompactThreshold: 389120,
    });
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
