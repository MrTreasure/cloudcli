import { afterEach, beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('official version checks use npm and share one request with independently readable bodies', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify({ name: '@cloudcli-ai/cloudcli', version: '1.37.5' })));
  vi.stubGlobal('fetch', fetch);
  const { api } = await import('@/shared/api');

  const responses = await Promise.all([
    api.version.latestRelease('siteboon', 'claudecodeui'),
    api.version.latestRelease('siteboon', 'claudecodeui'),
  ]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('https://registry.npmjs.org/@cloudcli-ai/cloudcli/latest');
  for (const response of responses) {
    expect(await response.json()).toMatchObject({ tag_name: 'v1.37.5', html_url: 'https://github.com/siteboon/claudecodeui/releases/tag/v1.37.5' });
  }
  await vi.advanceTimersByTimeAsync(59 * 60 * 1000);
  await api.version.latestRelease('siteboon', 'claudecodeui');
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60 * 1000);
  await api.version.latestRelease('siteboon', 'claudecodeui');
  expect(fetch).toHaveBeenCalledTimes(2);
});

test.each(['http', 'network'])('a %s failure backs off before allowing another version lookup', async (failure) => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    if (failure === 'network') throw new Error('network unavailable');
    return new Response(null, { status: 403 });
  });
  vi.stubGlobal('fetch', fetch);
  const { api } = await import('@/shared/api');

  expect((await api.version.latestRelease('siteboon', 'claudecodeui')).ok).toBe(false);
  await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
  await api.version.latestRelease('siteboon', 'claudecodeui');
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60 * 1000);
  await api.version.latestRelease('siteboon', 'claudecodeui');
  expect(fetch).toHaveBeenCalledTimes(2);
});
