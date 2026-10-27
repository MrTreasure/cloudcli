import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeProjectPath } from '@/shared/utils.js';

test('machine-local relocation uses directory boundaries and longest prefix without changing defaults', () => {
  const previous = process.env.CLOUDCLI_WORKSPACE_PATH_MAP;
  try {
    delete process.env.CLOUDCLI_WORKSPACE_PATH_MAP;
    assert.equal(normalizeProjectPath('/old/tree/app/../code/'), '/old/tree/code');
    process.env.CLOUDCLI_WORKSPACE_PATH_MAP = JSON.stringify({ '/old/tree': '/new', '/old/tree/special': '/special' });
    assert.equal(normalizeProjectPath('/old/tree'), '/new');
    assert.equal(normalizeProjectPath('/old/tree/code/'), '/new/code');
    assert.equal(normalizeProjectPath('/old/treehouse/code'), '/old/treehouse/code');
    assert.equal(normalizeProjectPath('/old/tree/special/code'), '/special/code');
    assert.equal(normalizeProjectPath(''), '');
    process.env.CLOUDCLI_WORKSPACE_PATH_MAP = '{"/old":"relative"}';
    assert.throws(() => normalizeProjectPath('/old/code'), /absolute non-root/);
    process.env.CLOUDCLI_WORKSPACE_PATH_MAP = '[]';
    assert.throws(() => normalizeProjectPath('/old/code'), /JSON object/);
    process.env.CLOUDCLI_WORKSPACE_PATH_MAP = '{"/old/tree":"/new"}';
    assert.equal(normalizeProjectPath('/old/tree/code'), '/new/code');
  } finally {
    if (previous === undefined) delete process.env.CLOUDCLI_WORKSPACE_PATH_MAP;
    else process.env.CLOUDCLI_WORKSPACE_PATH_MAP = previous;
  }
});
