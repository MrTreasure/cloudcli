import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { api } from '@/shared/api';
import { useVersionCheck } from '@/shared/hooks/useVersionCheck';

vi.mock('@/shared/constants', async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(),
  APP_VERSION: '1.37.3',
}));

let serverVersion: string;
let releaseTag: string;

beforeEach(() => {
  serverVersion = '1.37.4';
  releaseTag = 'v1.37.4';
  vi.spyOn(api.version, 'health').mockImplementation(async () => new Response(JSON.stringify({
    version: serverVersion,
    installMode: 'git',
  })));
  vi.spyOn(api.version, 'latestRelease').mockImplementation(async () => new Response(JSON.stringify({
    tag_name: releaseTag,
    name: 'CloudCLI UI',
  })));
});

test('an older open page does not advertise a release already running on the server', async () => {
  const { result } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await waitFor(() => expect(result.current.latestVersion).toBe('1.37.4'));
  await waitFor(() => expect(result.current.runningVersion).toBe('1.37.4'));
  expect(result.current.currentVersion).toBe('1.37.4');
  expect(result.current.updateAvailable).toBe(false);
  expect(result.current.restartRequired).toBe(false);
});

test('a newer upstream release still shows the update notice', async () => {
  releaseTag = 'v1.37.5';
  const { result } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await waitFor(() => expect(result.current.latestVersion).toBe('1.37.5'));
  expect(result.current.updateAvailable).toBe(true);
});

test('a server older than the frontend still requests a restart', async () => {
  serverVersion = '1.37.2';
  releaseTag = 'v1.37.3';
  const { result } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await waitFor(() => expect(result.current.runningVersion).toBe('1.37.2'));
  expect(result.current.restartRequired).toBe(true);
  expect(result.current.updateAvailable).toBe(false);
});

test('returning to an open page clears an update notice after the server was upgraded', async () => {
  serverVersion = '1.37.3';
  const { result, unmount } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await waitFor(() => expect(result.current.updateAvailable).toBe(true));
  serverVersion = '1.37.4';
  act(() => window.dispatchEvent(new Event('focus')));
  await waitFor(() => expect(result.current.runningVersion).toBe('1.37.4'));
  expect(result.current.updateAvailable).toBe(false);
  unmount();
  const requests = vi.mocked(api.version.health).mock.calls.length;
  act(() => window.dispatchEvent(new Event('focus')));
  expect(api.version.health).toHaveBeenCalledTimes(requests);
});

test('a failed health check falls back to the frontend version', async () => {
  vi.mocked(api.version.health).mockResolvedValue(new Response('', { status: 503 }));
  const { result } = renderHook(() => useVersionCheck('siteboon', 'claudecodeui'));
  await waitFor(() => expect(result.current.latestVersion).toBe('1.37.4'));
  expect(result.current.currentVersion).toBe('1.37.3');
  expect(result.current.updateAvailable).toBe(true);
  expect(result.current.restartRequired).toBe(false);
});
