import assert from 'node:assert/strict';

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, test, vi } from 'vitest';

import '@/modules/i18n';
import { useChatComposerState } from '@/modules/chat/hooks/useChatComposerState';
import type { PermissionMode, Project, ProjectSession, SessionActivityMap } from '@/shared/types';

/**
 * The composer's Compact button (ChatComposer.tsx) calls
 * `sendCompactCommand` without touching whatever the user is mid-typing —
 * it submits `/compact` as a synthetic queued draft, and `handleSubmit`
 * skips its end-of-submit input/attachment/draft clear whenever the
 * submission came from `queuedSubmission`. Same render harness as
 * composerSendOverBackgroundWork.test.ts.
 */

const PROJECT: Project = { projectId: 'project-1', displayName: 'Project One', fullPath: '/tmp/project-one' };
const SESSION: ProjectSession = { id: 'session-1' };

// Same background-work shape as composerSendOverBackgroundWork.test.ts: a
// session whose turn ended with background work still running, which makes
// sendCompactCommand's own window.confirm gate (useChatComposerState.ts, the
// backgroundActivity branch handleSubmit runs before actually sending) fire.
const backgroundOnly: SessionActivityMap = new Map([[
  'session-1',
  {
    statusText: null,
    canInterrupt: false,
    startedAt: 1,
    background: true,
    tasks: [
      { taskId: 'w1', toolUseId: 'toolu_wf', taskType: 'local_workflow', description: 'Audit the frontend', workflowName: 'frontend-architecture-audit', startedAt: 1 },
    ],
  },
]]);

const setup = (processingSessions?: SessionActivityMap, provider: 'claude' | 'codex' = 'claude', overrides: Partial<Parameters<typeof useChatComposerState>[0]> = {}) => {
  const sent: Array<{ type: string; content?: string }> = [];
  const view = renderHook(() =>
    useChatComposerState({
      selectedProject: PROJECT,
      selectedSession: SESSION,
      currentSessionId: SESSION.id,
      provider,
      permissionMode: 'default',
      cyclePermissionMode: () => undefined,
      resolvePermissionModeForProvider: () => 'default' as PermissionMode,
      currentProviderModel: 'test-model',
      currentProviderEffort: 'medium',
      isLoading: false,
      processingSessions,
      canAbortSession: false,
      tokenBudget: null,
      sendMessage: (message) => { sent.push(message as { type: string; content?: string }); },
      scrollToBottom: () => undefined,
      addMessage: () => undefined,
      setIsUserScrolledUp: () => undefined,
      setPendingPermissionRequests: () => undefined,
      ...overrides,
    }),
  );
  return { sent, view };
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })));
  localStorage.clear();
});

test('an async question answer steers a busy Codex turn without changing the draft', async () => {
  const item = { id: 'answer-1', sessionId: SESSION.id } as Awaited<ReturnType<NonNullable<Parameters<typeof useChatComposerState>[0]['enqueueQueuedMessage']>>>;
  const enqueue = vi.fn(async () => item);
  const steer = vi.fn();
  const { sent, view } = setup(undefined, 'codex', { isLoading: true, enqueueQueuedMessage: enqueue, steerQueuedMessage: steer, canSteerQueuedMessage: true });
  await act(async () => view.result.current.setInput('unsent draft'));
  await act(async () => view.result.current.answerAsyncQuestion([{ question: 'Which commands?', options: [] }], { 'Which commands?': 'slash commands' }));
  assert.equal(enqueue.mock.calls.length, 1);
  assert.equal(steer.mock.calls.length, 1);
  assert.deepEqual(steer.mock.calls[0], [item]);
  assert.equal(sent.length, 0);
  assert.equal(view.result.current.input, 'unsent draft');
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

test.each(['claude', 'codex'] as const)('the %s compact action sends /compact without touching the draft', async (provider) => {
  const { sent, view } = setup(undefined, provider);
  await act(async () => { view.result.current.setInput('my draft'); });

  await act(async () => { view.result.current.sendCompactCommand(); });

  const sends = sent.filter((message) => message.type === 'chat.send');
  assert.equal(sends.length, 1, 'exactly one chat.send');
  assert.equal(sends[0]?.content, '/compact');
  assert.equal(view.result.current.input, 'my draft', 'the draft is untouched');
});

test('the compact action sends nothing while a sent message is being edited', async () => {
  const { sent, view } = setup();
  await act(async () => { view.result.current.setInput('my draft'); });
  await act(async () => { view.result.current.beginEditMessage({ type: 'user', content: 'earlier message', timestamp: new Date(), transcriptAnchorId: 'anchor-1' }); });

  await act(async () => { view.result.current.sendCompactCommand(); });

  // Assert on every frame, not just `chat.send`: with the `editingAnchorId`
  // guard removed, `handleSubmit` would route `/compact` to `chat.edit-send`
  // instead (it replaces the message being edited), and a check scoped to
  // `chat.send` alone would not catch that — it would still read zero sends
  // and pass even though `/compact` went out.
  assert.equal(sent.length, 0, 'nothing is sent while editing');
});

test('declining the background-work confirm does not leave the Compact button stuck disabled', async () => {
  // Regression for compactInFlightRef getting stuck true: sendCompactCommand
  // sets the ref before handleSubmit runs, but handleSubmit can return
  // without ever starting a run when its own background-work confirm is
  // declined — the `isLoading`-effect release never fires because isLoading
  // never went true, so a second click was silently ignored forever.
  const confirm = vi.fn<(message?: string) => boolean>();
  vi.stubGlobal('confirm', confirm);

  const { sent, view } = setup(backgroundOnly);

  confirm.mockReturnValueOnce(false);
  await act(async () => { view.result.current.sendCompactCommand(); });
  assert.equal(sent.length, 0, 'declined: nothing sent');

  confirm.mockReturnValueOnce(true);
  await act(async () => { view.result.current.sendCompactCommand(); });

  const sends = sent.filter((message) => message.type === 'chat.send');
  assert.equal(sends.length, 1, 'confirming on retry sends exactly one frame');
  assert.equal(sends[0]?.content, '/compact');
});

test('immediate sends, edited resend and continuation all carry the current Fast snapshot', async () => {
  for (const codexFast of [true, false]) {
    const { view, sent } = setup(undefined, 'codex', { codexFast });
    await act(async () => view.result.current.setInput('continue'));
    await act(async () => view.result.current.handleSubmit({ preventDefault() {} } as never));
    assert.equal((sent[0] as unknown as { options: { codexFast: boolean } }).options.codexFast, codexFast);
    await act(async () => view.result.current.beginEditMessage({ type: 'user', content: 'edited prompt', transcriptAnchorId: 'turn-a', timestamp: new Date() }));
    await act(async () => view.result.current.handleSubmit({ preventDefault() {} } as never));
    assert.equal(sent[1]?.type, 'chat.edit-send');
    assert.equal((sent[1] as unknown as { options: { codexFast: boolean } }).options.codexFast, codexFast);
    view.unmount();
  }
});

test('queued Fast options survive toggles and a queue edit retains its existing choice', async () => {
  const queued = { id: 'q-fast', sessionId: SESSION.id, content: 'original', options: { codexFast: true }, attachments: [], revision: 1 } as never;
  const enqueue = vi.fn(async () => queued);
  const update = vi.fn(async () => queued);
  const { view } = setup(undefined, 'codex', { codexFast: false, isLoading: true, enqueueQueuedMessage: enqueue, updateQueuedMessage: update });
  await act(async () => view.result.current.setInput('standard draft'));
  await act(async () => view.result.current.handleSubmit({ preventDefault() {} } as never));
  assert.equal((enqueue.mock.calls[0] as unknown as [{ options: { codexFast: boolean } }])[0].options.codexFast, false);
  await act(async () => view.result.current.editQueuedDraft(queued));
  await act(async () => view.result.current.setInput('edited queue text'));
  await act(async () => view.result.current.handleSubmit({ preventDefault() {} } as never));
  assert.equal((update.mock.calls[0] as unknown as [unknown, { options: { codexFast: boolean } }])[1].options.codexFast, true);
});

test('a new session binds its draft Fast through HTTP before the first websocket send', async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  vi.stubGlobal('fetch', vi.fn(async (input, init) => {
    const url = String(input);
    if (url.endsWith('/api/providers/sessions')) {
      requests.push({ url, body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ success: true, data: { sessionId: 'new-app-session' } }));
    }
    return new Response('[]');
  }));
  const bind = vi.fn();
  const { view, sent } = setup(undefined, 'codex', { selectedSession: null, currentSessionId: null, codexFast: true, onCodexFastSessionCreated: bind });
  await act(async () => view.result.current.setInput('first prompt'));
  await act(async () => view.result.current.handleSubmit({ preventDefault() {} } as never));
  assert.equal(requests[0]?.body.codexFast, true);
  assert.deepEqual(bind.mock.calls[0], ['new-app-session', true]);
  assert.equal((sent[0] as unknown as { options: { codexFast: boolean } }).options.codexFast, true);
});
