import assert from 'node:assert/strict';

import { afterEach, beforeEach, test, vi } from 'vitest';

beforeEach(() => { localStorage.clear(); vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

for (const origin of ['', 'https://api.example']) {
  test(`version checks use the backend origin and keep credentials away from GitHub (${origin || 'same-origin'})`, async () => {
    vi.stubEnv('VITE_API_ORIGIN', origin);
    localStorage.setItem('auth-token', 'private-cloudcli-token');
    const fetcher = vi.fn(async (_url: string, _options?: RequestInit) => new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    const { api } = await import('@/shared/api');
    const controller = new AbortController();
    await api.system.health({ signal: controller.signal });
    await api.system.latestRelease('siteboon', 'claudecodeui', { signal: controller.signal });
    assert.equal(fetcher.mock.calls[0][0], `${origin}/health`);
    assert.equal(fetcher.mock.calls[0][1]?.cache, 'no-store');
    assert.equal(fetcher.mock.calls[1][0], 'https://api.github.com/repos/siteboon/claudecodeui/releases/latest');
    for (const [, options] of fetcher.mock.calls) {
      assert.equal(new Headers(options?.headers).has('Authorization'), false);
      assert.equal(options?.signal, controller.signal);
    }
  });
}
