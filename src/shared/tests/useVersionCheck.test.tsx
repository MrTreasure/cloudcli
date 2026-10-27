import assert from 'node:assert/strict';

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, test, vi } from 'vitest';

import { useVersionCheck } from '@/shared/hooks/useVersionCheck';

const requests = vi.hoisted(() => ({ health: vi.fn(), latestRelease: vi.fn() }));
vi.mock('@/shared/constants', () => ({ APP_VERSION: '1.37.5' }));
vi.mock('@/shared/api', () => ({ api: { system: requests } }));

const health = (version: string) => new Response(JSON.stringify({ version, installMode: 'npm' }));
const release = (version: string) => new Response(JSON.stringify({
  tag_name: `v${version}`, name: `CloudCLI UI v${version}`, body: 'Release notes',
}));

beforeEach(() => {
  vi.useFakeTimers();
  requests.health.mockReset().mockImplementation(async () => health('1.37.6'));
  requests.latestRelease.mockReset().mockImplementation(async () => release('1.37.6'));
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

test('an old browser does not offer the release already running on the server', async () => {
  const { result } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await act(async () => {});
  assert.equal(result.current.runningVersion, '1.37.6');
  assert.equal(result.current.currentVersion, '1.37.6');
  assert.equal(result.current.updateAvailable, false);
  assert.equal(result.current.restartRequired, false);
  assert.equal(result.current.installMode, 'npm');
  assert.equal(result.current.releaseInfo?.title, 'CloudCLI UI v1.37.6');
});

test('a genuinely newer release remains visible, including multi-digit patch versions', async () => {
  requests.latestRelease.mockImplementation(async () => release('1.37.10'));
  const { result } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await act(async () => {});
  assert.equal(result.current.latestVersion, '1.37.10');
  assert.equal(result.current.updateAvailable, true);
});

test('a server older than the installed frontend needs a restart, not another download', async () => {
  requests.health.mockImplementation(async () => health('1.37.4'));
  requests.latestRelease.mockImplementation(async () => release('1.37.5'));
  const { result } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await act(async () => {});
  assert.equal(result.current.currentVersion, '1.37.5');
  assert.equal(result.current.restartRequired, true);
  assert.equal(result.current.updateAvailable, false);
});

test('the next check learns a server upgrade without remounting the sidebar', async () => {
  requests.health.mockImplementationOnce(async () => health('1.37.5'));
  const { result } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await act(async () => {});
  assert.equal(result.current.updateAvailable, true);
  await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60 * 1000); });
  assert.equal(requests.health.mock.calls.length, 2);
  assert.equal(result.current.updateAvailable, false);
  assert.equal(result.current.currentVersion, '1.37.6');
});

test('a quick release response waits for health before deciding whether to offer an update', async () => {
  let finishHealth!: (response: Response) => void;
  requests.health.mockImplementation(() => new Promise<Response>((resolve) => { finishHealth = resolve; }));
  const { result } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await act(async () => {});
  assert.equal(result.current.updateAvailable, false);
  await act(async () => { finishHealth(health('1.37.6')); });
  assert.equal(result.current.updateAvailable, false);
  assert.equal(result.current.currentVersion, '1.37.6');
});

test('an HTTP error is not accepted as valid version metadata', async () => {
  requests.latestRelease.mockImplementation(async () => new Response('{"tag_name":"v99.0.0"}', { status: 403 }));
  const { result } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await act(async () => {});
  assert.equal(result.current.runningVersion, '1.37.6');
  assert.equal(result.current.latestVersion, null);
  assert.equal(result.current.updateAvailable, false);
});

test('unmount aborts in-flight checks and clears future polling', async () => {
  requests.health.mockImplementation(() => new Promise(() => {}));
  const { unmount } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  const signal = requests.health.mock.calls[0][0].signal as AbortSignal;
  assert.equal(signal.aborted, false);
  unmount();
  assert.equal(signal.aborted, true);
  await act(async () => { await vi.advanceTimersByTimeAsync(20 * 60 * 1000); });
  assert.equal(requests.health.mock.calls.length, 1);
});
