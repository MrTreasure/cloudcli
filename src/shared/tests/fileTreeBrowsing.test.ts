import { afterEach, expect, test, vi } from 'vitest';

import { api } from '@/shared/api';

afterEach(() => vi.unstubAllGlobals());

test('file browsing requests hidden configuration files without Git ignore filtering and preserves cancellation', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response('[]'));
  vi.stubGlobal('fetch', fetch);
  const controller = new AbortController();
  await api.getFiles('project-1', { signal: controller.signal });
  const [input, options] = fetch.mock.calls[0];
  const url = new URL(String(input), 'http://localhost');
  expect(url.pathname).toBe('/api/file-tree/projects/project-1/files');
  expect(url.searchParams.get('respectGitignore')).not.toBe('true');
  expect(options?.signal).toBe(controller.signal);
});
