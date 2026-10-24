import assert from 'node:assert/strict';

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, test, vi } from 'vitest';

import { useAdaptivePolling } from '@/shared/hooks/useAdaptivePolling';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

for (const [state, active, hidden, calls] of [
  ['idle', false, false, 10], ['active', true, false, 60], ['hidden', true, true, 5],
] as const) {
  test(`five minutes ${state}: ${calls} authoritative requests per tab`, async () => {
    if (hidden) vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const refresh = vi.fn(async () => {});
    renderHook(() => useAdaptivePolling({ refresh, active }));
    await act(async () => { await vi.advanceTimersByTimeAsync(299_999); });
    assert.equal(refresh.mock.calls.length, calls);
  });
}

test('slow requests never overlap and changed callbacks do not restart the timer', async () => {
  let resolve!: () => void;
  const refresh = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
  const hook = renderHook(() => useAdaptivePolling({ refresh: (signal) => { void signal; return refresh(); }, active: true }));
  hook.rerender();
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  assert.equal(refresh.mock.calls.length, 1);
  await act(async () => resolve());
  await act(async () => { await vi.advanceTimersByTimeAsync(4_999); });
  assert.equal(refresh.mock.calls.length, 1);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  assert.equal(refresh.mock.calls.length, 2);
});

test('offline pauses HTTP only; online and visibility recovery each reconcile once', async () => {
  const refresh = vi.fn(async () => {});
  renderHook(() => useAdaptivePolling({ refresh, active: false }));
  await act(async () => {});
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  act(() => window.dispatchEvent(new Event('offline')));
  await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
  assert.equal(refresh.mock.calls.length, 1);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  act(() => window.dispatchEvent(new Event('online')));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  assert.equal(refresh.mock.calls.length, 2);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  await act(async () => { await vi.advanceTimersByTimeAsync(40_000); });
  assert.equal(refresh.mock.calls.length, 2);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  assert.equal(refresh.mock.calls.length, 3);
});

test('failures back off with a bound, event bursts respect it, success resets cadence', async () => {
  const refresh = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useAdaptivePolling({ refresh, active: true }));
  await act(async () => { await vi.advanceTimersByTimeAsync(155_000); });
  assert.equal(refresh.mock.calls.length, 6);
  act(() => { for (let i = 0; i < 100; i++) result.current(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(119_999); });
  assert.equal(refresh.mock.calls.length, 6);
  refresh.mockResolvedValue(undefined);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  assert.equal(refresh.mock.calls.length, 7);
  await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
  assert.equal(refresh.mock.calls.length, 8);
});

test('auth rejection stops retries and unmount releases timer and listeners', async () => {
  const refresh = vi.fn(async () => { throw Object.assign(new Error('expired'), { status: 401 }); });
  const { result, unmount } = renderHook(() => useAdaptivePolling({ refresh, active: true }));
  await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
  act(() => result.current());
  await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
  assert.equal(refresh.mock.calls.length, 1);
  unmount();
  assert.equal(vi.getTimerCount(), 0);
});
