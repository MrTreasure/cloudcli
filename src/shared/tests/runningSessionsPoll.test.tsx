import assert from 'node:assert/strict';

import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, test, vi } from 'vitest';

/**
 * The running-sessions poll is what a refreshed page or a second tab learns a
 * session's background work from. Its task entries must reach the activity
 * map whole — including the `nested` flag that tells a task the session's own
 * turn launched from one its agents launched for themselves — or the pill
 * counts an agent's backgrounded command as a second task of the session's.
 */

const runningSessions = vi.fn();

vi.mock('@/shared/api', () => ({
  api: { runningSessions: () => runningSessions() },
}));

beforeEach(() => {
  vi.resetModules();
  runningSessions.mockReset();
});

test('the poll carries each task through whole, nested flag included', async () => {
  runningSessions.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        sessions: [{
          sessionId: 'held-session',
          provider: 'claude',
          startedAt: 1_700_000_000_000,
          lastSeq: 0,
          background: true,
          canInterrupt: false,
          tasks: [
            { taskId: 'w1', toolUseId: 'toolu_wf', taskType: 'local_workflow', description: 'one agent that waits', workflowName: 'probe', startedAt: 1_700_000_000_000 },
            { taskId: 'b1', toolUseId: 'toolu_inner', taskType: 'local_bash', description: 'Sleep for 60 seconds', startedAt: 1_700_000_001_000, nested: true },
          ],
        }],
      },
    }),
  });

  const { SessionProtectionProvider, useProcessingSessions } = await import('@/shared/context/SessionProtectionContext');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(SessionProtectionProvider, null, children);
  const { result } = renderHook(() => useProcessingSessions(), { wrapper });

  await waitFor(() => assert.ok(result.current.get('held-session')));
  const activity = result.current.get('held-session');
  assert.equal(activity?.background, true);
  assert.deepEqual(activity?.tasks?.map((task) => [task.taskId, task.nested ?? false]), [['w1', false], ['b1', true]]);
});

test('one task entry in a shape the client does not read hides only itself', async () => {
  // A newer server may list a task kind this client never learned; the
  // session's other work must still show.
  runningSessions.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        sessions: [{
          sessionId: 'held-session',
          provider: 'claude',
          startedAt: 1_700_000_000_000,
          lastSeq: 0,
          background: true,
          canInterrupt: false,
          tasks: [
            { taskId: 'w1', toolUseId: 'toolu_wf', taskType: 'local_workflow', description: 'one agent that waits', startedAt: 1_700_000_000_000 },
            { taskId: 'x1', toolUseId: 'toolu_x', taskType: 'remote_agent', description: 'Unreadable', startedAt: 'yesterday' },
          ],
        }],
      },
    }),
  });

  const { SessionProtectionProvider, useProcessingSessions } = await import('@/shared/context/SessionProtectionContext');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(SessionProtectionProvider, null, children);
  const { result } = renderHook(() => useProcessingSessions(), { wrapper });

  await waitFor(() => assert.ok(result.current.get('held-session')));
  assert.deepEqual(result.current.get('held-session')?.tasks?.map((task) => task.taskId), ['w1']);
});

test('late older polls and malformed responses do not replace a newer running snapshot', async () => {
  vi.useFakeTimers();
  let resolveFirst: (value: unknown) => void = () => undefined;
  let resolveSecond: (value: unknown) => void = () => undefined;
  const first = new Promise(resolve => { resolveFirst = resolve; });
  const second = new Promise(resolve => { resolveSecond = resolve; });
  const response = (sessions: unknown[]) => ({ ok: true, json: async () => ({ data: { sessions } }) });
  runningSessions.mockReturnValueOnce(first).mockReturnValueOnce(second)
    .mockResolvedValue({ ok: true, json: async () => ({ success: false }) });
  try {
    const { SessionProtectionProvider, useProcessingSessions } = await import('@/shared/context/SessionProtectionContext');
    const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(SessionProtectionProvider, null, children);
    const view = renderHook(() => useProcessingSessions(), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    await act(async () => { resolveSecond(response([{ sessionId: 'running-session', startedAt: 1 }])); });
    assert.ok(view.result.current.has('running-session'));
    await act(async () => { resolveFirst(response([])); });
    assert.ok(view.result.current.has('running-session'), 'an older empty response must not clear the newer snapshot');
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    assert.ok(view.result.current.has('running-session'), 'a malformed response is not authoritative idle');
    runningSessions.mockResolvedValue(response([]));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    assert.equal(view.result.current.has('running-session'), false, 'a newer valid empty snapshot still recovers a missed completion');
    view.unmount();
  } finally { vi.useRealTimers(); }
});
