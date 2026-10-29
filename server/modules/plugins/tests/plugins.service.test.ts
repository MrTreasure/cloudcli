import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';

import express from 'express';

import { createPluginsRouter } from '../plugins.routes.js';
import { createPluginsService } from '../plugins.service.js';

type Dependencies = Parameters<typeof createPluginsService>[0];

function dependencies(overrides: Partial<Dependencies> = {}): Dependencies {
  return {
    scanPlugins: () => [], readConfig: () => ({}), saveConfig: () => undefined,
    getPluginDirectory: () => null, getPluginsDirectory: () => '/plugins',
    resolveAsset: () => null, assetIsFile: () => false, contentType: () => 'text/plain',
    install: async () => ({ name: 'plugin', dirName: 'plugin' }),
    update: async () => ({ name: 'plugin', dirName: 'plugin' }),
    uninstall: async () => undefined, startServer: async () => 4000,
    stopServer: async () => undefined, getServerPort: () => undefined,
    isServerRunning: () => false, joinPath: (...parts) => parts.join('/'),
    logError: () => undefined, ...overrides,
  };
}

test('update restarts a running plugin server when the update fails', async () => {
  const operations: string[] = [];
  let running = true;
  const service = createPluginsService(dependencies({
    scanPlugins: () => [{ name: 'demo', dirName: 'demo', server: 'server.js' }],
    getPluginDirectory: () => '/plugins/demo',
    isServerRunning: () => running,
    stopServer: async () => { operations.push('stop'); running = false; },
    update: async () => { operations.push('pull'); throw new Error('git pull failed'); },
    startServer: async () => { operations.push('start'); running = true; return 4000; },
  }));
  await assert.rejects(service.update('demo'), /git pull failed/);
  assert.deepEqual(operations, ['stop', 'pull', 'start']);
});

test('a failed update does not start a plugin server that was not running', async () => {
  const operations: string[] = [];
  const service = createPluginsService(dependencies({
    scanPlugins: () => [{ name: 'demo', dirName: 'demo', server: 'server.js' }],
    getPluginDirectory: () => '/plugins/demo',
    update: async () => { operations.push('pull'); throw new Error('git pull failed'); },
    startServer: async () => { operations.push('start'); return 4000; },
  }));
  await assert.rejects(service.update('demo'), /git pull failed/);
  assert.deepEqual(operations, ['pull']);
});

test('setEnabled persists configuration and starts an enabled plugin server', async () => {
  const operations: string[] = [];
  const service = createPluginsService(dependencies({
    scanPlugins: () => [{ name: 'demo', dirName: 'demo', server: { entry: 'server.js' } }],
    getPluginDirectory: () => '/plugins/demo',
    saveConfig: () => operations.push('save'),
    startServer: async () => { operations.push('start'); return 4000; },
  }));
  await service.setEnabled('demo', true);
  assert.deepEqual(operations, ['save', 'start']);
});


test('native agent RPC uses host-verified account identity and never forwards caller credentials', async () => {
  const worker = http.createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ account: request.headers['x-plugin-user-id'] ?? null,
      authorization: request.headers.authorization ?? null, cookie: request.headers.cookie ?? null }));
  });
  await new Promise<void>((resolve) => worker.listen(0, '127.0.0.1', resolve));
  const address = worker.address();
  assert.ok(address && typeof address !== 'string');
  const service = createPluginsService(dependencies({
    scanPlugins: () => [{ name: 'codex-agents', dirName: 'native', server: 'server.js' }, { name: 'other', dirName: 'other', server: 'server.js' }],
    getPluginDirectory: () => '/plugins/native', getServerPort: () => address.port,
  }));
  const app = express();
  app.use((request, _response, next) => {
    if (request.headers['x-test-account']) Object.assign(request, { user: { id: request.headers['x-test-account'] } });
    next();
  });
  app.use(createPluginsRouter(service));
  const host = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => host.once('listening', resolve));
  const hostAddress = host.address();
  assert.ok(hostAddress && typeof hostAddress !== 'string');
  try {
    for (const [plugin, account, expected] of [['codex-agents', '7', '7'], ['codex-agents', '', null], ['other', '7', null]]) {
      const response = await fetch(`http://127.0.0.1:${hostAddress.port}/${plugin}/rpc/agents`, { headers: {
        'x-test-account': account ?? '', 'x-plugin-user-id': 'spoofed', authorization: 'Bearer mock', cookie: 'mock=value',
      } });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { account: expected, authorization: null, cookie: null });
    }
  } finally {
    await Promise.all([new Promise<void>((resolve) => host.close(() => resolve())), new Promise<void>((resolve) => worker.close(() => resolve()))]);
  }
});
