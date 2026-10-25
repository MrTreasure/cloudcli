import assert from 'node:assert/strict';

import { afterEach, beforeEach, test, vi } from 'vitest';

beforeEach(() => { localStorage.clear(); vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); });

for (const origin of ['', 'https://api.example']) {
  test(`pending snapshots share one body-complete GET and permit preflight reuse (${origin || 'same-origin'})`, async () => {
    vi.stubEnv('VITE_API_ORIGIN', origin);
    localStorage.setItem('auth-token', 'account-a');
    let finishBody!: (value: ArrayBuffer) => void;
    const response = new Response('{}', { headers: { 'Content-Type': 'application/json' } });
    vi.spyOn(response, 'arrayBuffer').mockImplementation(() => new Promise((resolve) => { finishBody = resolve; }));
    const fetcher = vi.fn(async () => response);
    vi.stubGlobal('fetch', fetcher);
    const { api } = await import('@/shared/api');
    const one = api.runningSessions();
    const two = api.runningSessions();
    await Promise.resolve();
    await Promise.resolve();
    const three = api.runningSessions();
    assert.equal(fetcher.mock.calls.length, 1);
    const request = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    assert.equal(request[0], origin + '/api/providers/sessions/running?__cloudcli_transport=2');
    assert.equal(request[1].cache, 'default');
    assert.equal(new Headers(request[1].headers).has('Content-Type'), false);
    assert.equal(new Headers(request[1].headers).get('Authorization'), 'Bearer account-a');
    finishBody(new TextEncoder().encode('{"data":{"sessions":[]}}').buffer);
    const results = await Promise.all([one, two, three]);
    assert.deepEqual(await Promise.all(results.map((result) => result.json())), Array(3).fill({ data: { sessions: [] } }));
    fetcher.mockImplementation(async () => new Response('{}'));
    await api.runningSessions();
    assert.equal(fetcher.mock.calls.length, 2, 'settled business responses are never cached');
  });
}

test('different identities do not share pending snapshots or apply stale authentication headers', async () => {
  const resolvers: Array<(response: Response) => void> = [];
  const fetcher = vi.fn(() => new Promise<Response>((resolve) => resolvers.push(resolve)));
  vi.stubGlobal('fetch', fetcher);
  const { api } = await import('@/shared/api');
  localStorage.setItem('auth-token', 'account-a');
  const first = api.runningSessions();
  localStorage.setItem('auth-token', 'account-b');
  const second = api.runningSessions();
  assert.equal(fetcher.mock.calls.length, 2);
  resolvers[0](new Response('{"old":true}', { status: 401, headers: { 'X-Auth-Error': 'expired' } }));
  resolvers[1](new Response('{"new":true}'));
  await Promise.all([first, second]);
  assert.equal(localStorage.getItem('auth-token'), 'account-b');
});

test('snapshot timeout aborts a stalled request and permits a later attempt', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
    options.signal!.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')));
  }));
  vi.stubGlobal('fetch', fetcher);
  const { api } = await import('@/shared/api');
  const first = api.user.drafts();
  const rejected = assert.rejects(first, /timeout/);
  await vi.advanceTimersByTimeAsync(15_000);
  await rejected;
  const second = api.user.drafts();
  const rejectedAgain = assert.rejects(second, /timeout/);
  assert.equal(fetcher.mock.calls.length, 2);
  await vi.advanceTimersByTimeAsync(15_000);
  await rejectedAgain;
});
