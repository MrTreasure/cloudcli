import { describe, expect, it, vi } from 'vitest';

import { api, ApiRequestError, readApiJson } from '@/shared/api';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const failure = <T>(promise: Promise<T>): Promise<unknown> =>
  promise.then(
    () => {
      throw new Error('expected readApiJson to reject');
    },
    (error: unknown) => error,
  );

describe('readApiJson', () => {
  it('resolves the payload for successful envelopes', async () => {
    const data = await readApiJson<{ data: { ok: boolean } }>(
      jsonResponse({ success: true, data: { ok: true } }),
    );
    expect(data.data.ok).toBe(true);
  });

  it('throws an ApiRequestError carrying code/details/status for the structured AppError envelope', async () => {
    const error = await failure(
      readApiJson(
        jsonResponse(
          {
            success: false,
            error: { code: 'BROWSER_USE_SESSION_STOP_FAILED', message: 'Failed to stop.', details: 'inner detail' },
          },
          400,
        ),
      ),
    );
    expect(error).toBeInstanceOf(ApiRequestError);
    const apiError = error as ApiRequestError;
    expect(apiError.message).toBe('Failed to stop.');
    expect(apiError.code).toBe('BROWSER_USE_SESSION_STOP_FAILED');
    expect(apiError.details).toBe('inner detail');
    expect(apiError.status).toBe(400);
  });

  it('preserves top-level details on legacy string envelopes', async () => {
    const error = await failure(
      readApiJson(jsonResponse({ success: false, error: 'boom', details: 'legacy detail' }, 500)),
    );
    expect(error).toBeInstanceOf(ApiRequestError);
    const apiError = error as ApiRequestError;
    expect(apiError.message).toBe('boom');
    expect(apiError.details).toBe('legacy detail');
    expect(apiError.code).toBeUndefined();
    expect(apiError.status).toBe(500);
  });

  it('uses the HTTP status text when the envelope has neither error nor details', async () => {
    const error = await failure(readApiJson(jsonResponse({ success: false }, 502)));
    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).message).toBe('Request failed (502)');
    expect((error as ApiRequestError).code).toBeUndefined();
  });
});


describe('file browsing request', () => {
  it('includes gitignored hidden configuration and preserves request cancellation', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response('[]'));
    vi.stubGlobal('fetch', fetch);
    try {
      const controller = new AbortController();
      await api.getFiles('project-1', { signal: controller.signal });
      const [input, options] = fetch.mock.calls[0];
      const url = new URL(String(input), 'http://localhost');
      expect(url.pathname).toBe('/api/file-tree/projects/project-1/files');
      expect(url.searchParams.has('respectGitignore')).toBe(false);
      expect(options?.signal).toBe(controller.signal);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
