import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import cors from 'cors';
import express from 'express';

import { createCorsPolicy } from '@/modules/auth/index.js';

test('only the configured origin receives preflight cache and exposed auth headers', async () => {
  const app = express();
  app.use(cors(createCorsPolicy('https://frontend.example')));
  app.use((_req, res) => { res.setHeader('Cache-Control', 'no-store'); res.status(401).json({ error: 'authentication required' }); });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const origin of ['https://frontend.example', 'https://attacker.example']) {
      const response = await fetch(base + '/api/test', { method: 'OPTIONS', headers: {
        Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization,content-type',
      } });
      if (origin === 'https://frontend.example') {
        assert.equal(response.status, 204);
        assert.equal(response.headers.get('access-control-max-age'), '600');
        assert.equal(response.headers.get('access-control-allow-origin'), origin);
        assert.match(response.headers.get('access-control-allow-headers')!, /authorization/);
        assert.match(response.headers.get('vary')!, /Origin/);
      } else {
        assert.equal(response.headers.get('access-control-allow-origin'), null);
        assert.equal(response.headers.get('access-control-max-age'), null);
      }
    }
    const business = await fetch(base + '/api/test', { headers: { Origin: 'https://frontend.example' } });
    assert.equal(business.status, 401);
    assert.equal(business.headers.get('cache-control'), 'no-store');
    assert.match(business.headers.get('access-control-expose-headers')!, /X-Refreshed-Token/);
    assert.equal(business.headers.get('access-control-max-age'), null);
    assert.equal(createCorsPolicy(undefined).origin, false);
    const sameOrigin = await fetch(base + '/api/test');
    assert.equal(sameOrigin.status, 401);
    assert.equal(sameOrigin.headers.get('access-control-allow-origin'), null);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});
