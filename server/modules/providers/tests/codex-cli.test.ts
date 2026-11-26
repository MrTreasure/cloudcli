import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCodexCommandLine } from '@/modules/providers/list/codex/codex-cli.js';

test('the Codex child command uses the configured launcher, or the host PATH', () => {
  const original = process.env.CODEX_CLI_PATH;
  try {
    delete process.env.CODEX_CLI_PATH;
    assert.deepEqual(resolveCodexCommandLine(), ['codex']);
    process.env.CODEX_CLI_PATH = '/example/global/codex';
    assert.deepEqual(resolveCodexCommandLine(), ['/example/global/codex']);
    process.env.CODEX_CLI_PATH = '/example/global/codex.js';
    assert.deepEqual(resolveCodexCommandLine(), [process.execPath, '/example/global/codex.js']);
  } finally {
    if (original === undefined) delete process.env.CODEX_CLI_PATH;
    else process.env.CODEX_CLI_PATH = original;
  }
});
