import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { useCodexFastState } from '@/modules/chat/hooks/useCodexFastState';
import { api } from '@/shared/api';

const reply = (sessionId: string, codexFast: boolean) => new Response(JSON.stringify({
  success: true, data: { sessionId, codexFast },
}));
afterEach(() => vi.restoreAllMocks());

test('two sessions restore independently and delayed reads cannot overwrite the selected session', async () => {
  let finishA!: (value: Response) => void;
  vi.spyOn(api.providers, 'sessionCodexFast').mockImplementation(async (id) => id === 'A'
    ? new Promise<Response>((resolve) => { finishA = resolve; }) : reply(id, false));
  const view = renderHook(({ id }) => useCodexFastState(id, 'project', true), { initialProps: { id: 'A' } });
  expect(view.result.current.codexFastReady).toBe(false);
  await waitFor(() => expect(finishA).toBeTypeOf('function'));
  view.rerender({ id: 'B' });
  await waitFor(() => expect(view.result.current.codexFastReady).toBe(true));
  await act(async () => finishA(reply('A', true)));
  expect(view.result.current.codexFast).toBe(false);
  vi.mocked(api.providers.sessionCodexFast).mockImplementation(async (id) => reply(id, id === 'A'));
  view.rerender({ id: 'A' });
  await waitFor(() => expect(view.result.current.codexFast).toBe(true));
  view.unmount();
  const reopened = renderHook(() => useCodexFastState('A', 'project', true));
  await waitFor(() => expect(reopened.result.current.codexFast).toBe(true));
});

test('persisted changes target only the application session and draft choices reset after binding', async () => {
  const stored = new Map<string, boolean>();
  vi.spyOn(api.providers, 'sessionCodexFast').mockImplementation(async (id) => reply(id, stored.get(id) ?? false));
  const save = vi.spyOn(api.providers, 'setSessionCodexFast').mockImplementation(async (id, value) => {
    stored.set(id, value); return reply(id, value);
  });
  const view = renderHook(({ id, draft }) => useCodexFastState(id, draft, true), {
    initialProps: { id: null as string | null, draft: 'new-1' },
  });
  expect(view.result.current.codexFast).toBe(false);
  await act(async () => view.result.current.selectCodexFast(true));
  expect(save).not.toHaveBeenCalled();
  stored.set('A', true); // The session creation endpoint stored the send-time draft.
  act(() => view.result.current.bindCodexFastDraft('A', true));
  view.rerender({ id: 'A', draft: 'new-1' });
  await waitFor(() => expect(view.result.current.codexFastReady).toBe(true));
  expect(view.result.current.codexFast).toBe(true);
  await act(async () => view.result.current.selectCodexFast(false));
  expect(save).toHaveBeenCalledWith('A', false);
  view.rerender({ id: 'B', draft: 'new-1' });
  await waitFor(() => expect(view.result.current.codexFastReady).toBe(true));
  expect(view.result.current.codexFast).toBe(false);
  view.rerender({ id: null, draft: 'new-2' });
  expect(view.result.current.codexFast).toBe(false);
});

test('failed metadata is visible and must be retried before any send snapshot is allowed', async () => {
  const load = vi.spyOn(api.providers, 'sessionCodexFast').mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(reply('A', true));
  const view = renderHook(() => useCodexFastState('A', 'project', true));
  await waitFor(() => expect(view.result.current.codexFastError).toContain('offline'));
  expect(view.result.current.codexFastReady).toBe(false);
  await act(async () => view.result.current.selectCodexFast(true));
  await waitFor(() => expect(view.result.current.codexFastReady).toBe(true));
  expect(load).toHaveBeenCalledTimes(2);
  expect(view.result.current.codexFast).toBe(true);
});

test('other providers neither request metadata nor expose Fast', async () => {
  const load = vi.spyOn(api.providers, 'sessionCodexFast');
  const view = renderHook(() => useCodexFastState('claude-A', 'project', false));
  await act(async () => view.result.current.selectCodexFast(true));
  expect(load).not.toHaveBeenCalled();
  expect(view.result.current.codexFast).toBe(false);
  expect(view.result.current.codexFastReady).toBe(true);
});

test('reopening a session while saving waits for its write before reading metadata', async () => {
  const stored = new Map<string, boolean>();
  let finishWrite!: () => void;
  vi.spyOn(api.providers, 'sessionCodexFast').mockImplementation(async (id) => reply(id, stored.get(id) ?? false));
  vi.spyOn(api.providers, 'setSessionCodexFast').mockImplementation(async (id, enabled) => {
    await new Promise<void>((resolve) => { finishWrite = resolve; });
    stored.set(id, enabled); return reply(id, enabled);
  });
  const view = renderHook(({ id }) => useCodexFastState(id, 'draft', true), { initialProps: { id: 'A' } });
  await waitFor(() => expect(view.result.current.codexFastReady).toBe(true));
  let save!: Promise<void>;
  act(() => { save = view.result.current.selectCodexFast(true); });
  view.rerender({ id: 'B' });
  await waitFor(() => expect(view.result.current.codexFastReady).toBe(true));
  view.rerender({ id: 'A' });
  expect(view.result.current.codexFastReady).toBe(false);
  await act(async () => { finishWrite(); await save; });
  await waitFor(() => expect(view.result.current.codexFastReady).toBe(true));
  expect(view.result.current.codexFast).toBe(true);
});
