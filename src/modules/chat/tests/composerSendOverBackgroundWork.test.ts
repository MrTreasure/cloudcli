import assert from 'node:assert/strict';

import { createElement } from 'react';
import { act, render as renderComponent, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, test, vi } from 'vitest';

import '@/modules/i18n';
import QueuedMessageCard from '@/modules/chat/composer/QueuedMessageCard';
import { api } from '@/shared/api';
import { useChatComposerState } from '@/modules/chat/hooks/useChatComposerState';
import { clearQueuedMessage, readQueuedMessage } from '@/shared/chatDrafts';
import type * as ChatDrafts from '@/shared/chatDrafts';
import type { BackgroundSendChoice, PermissionMode, Project, ProjectSession, SessionActivityMap } from '@/shared/types';

/**
 * A session whose turn has ended with background work still running keeps
 * its composer usable — but a new turn replaces the CLI process that work
 * runs under, so the work is stopped or finishes where nothing listens. The
 * composer says so and asks before sending: send anyway, queue the message
 * until the work finishes (the server holds it while the work runs), or
 * cancel.
 */

const { writeQueuedMessage } = vi.hoisted(() => ({ writeQueuedMessage: vi.fn() }));

vi.mock('@/shared/chatDrafts', async (importOriginal) => {
  const actual = await importOriginal<typeof ChatDrafts>();
  return {
    ...actual,
    writeQueuedMessage: (...args: Parameters<typeof actual.writeQueuedMessage>) => {
      writeQueuedMessage(...args);
      actual.writeQueuedMessage(...args);
    },
  };
});

const PROJECT: Project = { projectId: 'project-1', displayName: 'Project One', fullPath: '/tmp/project-one' };
const SESSION: ProjectSession = { id: 'session-1' };
const UPLOADED = { name: 'notes.txt', path: '/uploads/notes.txt', mimeType: 'text/plain', size: 5 };

const backgroundOnly: SessionActivityMap = new Map([[
  'session-1',
  {
    statusText: null,
    canInterrupt: false,
    startedAt: 1,
    background: true,
    tasks: [
      { taskId: 'w1', toolUseId: 'toolu_wf', taskType: 'local_workflow', description: 'Audit the frontend', workflowName: 'frontend-architecture-audit', startedAt: 1 },
      { taskId: 'b1', toolUseId: 'toolu_inner', taskType: 'local_bash', description: 'Sleep for 60 seconds', startedAt: 2, nested: true },
      { taskId: 'a1', toolUseId: 'toolu_agent', taskType: 'local_agent', description: 'Survey the repo', startedAt: 3 },
    ],
  },
]]);

const uploads = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/api/assets/files'));

const render = (processingSessions: SessionActivityMap, runningCodex = false) => {
  const sent: Array<{ type: string }> = [];
  const view = renderHook(() =>
    useChatComposerState({
      selectedProject: PROJECT,
      selectedSession: SESSION,
      currentSessionId: SESSION.id,
      provider: runningCodex ? 'codex' : 'claude',
      permissionMode: 'default',
      cyclePermissionMode: () => undefined,
      resolvePermissionModeForProvider: () => 'default' as PermissionMode,
      currentProviderModel: 'test-model',
      currentProviderEffort: 'medium',
      isLoading: runningCodex,
      processingSessions,
      canAbortSession: false,
      tokenBudget: null,
      sendMessage: (message) => { sent.push(message as { type: string }); },
      scrollToBottom: () => undefined,
      addMessage: () => undefined,
      setIsUserScrolledUp: () => undefined,
      setPendingPermissionRequests: () => undefined,
    }),
  );
  const sends = () => sent.filter((message) => message.type === 'chat.send');
  return { view, sends };
};

type View = ReturnType<typeof render>['view'];

const startSubmit = (view: View) => {
  let pending!: Promise<void>;
  act(() => {
    pending = view.result.current.handleSubmit({ preventDefault: () => undefined } as never);
  });
  return pending;
};

// Submits, waits for the prompt, answers it, and lets the submit finish.
const submitAndAnswer = async (view: View, choice: BackgroundSendChoice) => {
  const pending = startSubmit(view);
  await waitFor(() => assert.notEqual(view.result.current.backgroundSendPrompt, null));
  await act(async () => {
    view.result.current.resolveBackgroundSendPrompt(choice);
    await pending;
  });
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL) => {
    if (String(url).includes('/api/assets/files')) {
      return new Response(JSON.stringify({ attachments: [UPLOADED] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }));
  // The drafts store is module state; a message queued by one test must not
  // be restored into the next one's composer.
  clearQueuedMessage(SESSION.id);
  writeQueuedMessage.mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('sending on a session with background work asks first, naming the session\'s own tasks', async () => {
  const { view, sends } = render(backgroundOnly);
  await act(async () => { view.result.current.setInput('hello'); });

  const pending = startSubmit(view);
  await waitFor(() => assert.notEqual(view.result.current.backgroundSendPrompt, null));

  assert.deepEqual(view.result.current.backgroundSendPrompt, {
    work: ['Workflow frontend-architecture-audit', 'Agent Survey the repo'],
  });
  assert.equal(sends().length, 0, 'nothing is sent while the prompt is open');

  await act(async () => {
    view.result.current.resolveBackgroundSendPrompt('cancel');
    await pending;
  });
});

test('cancel (the default answer to Enter, Esc or a click outside) sends nothing and keeps the draft', async () => {
  const { view, sends } = render(backgroundOnly);
  await act(async () => { view.result.current.setInput('hello'); });

  await submitAndAnswer(view, 'cancel');

  assert.equal(sends().length, 0, 'declined: nothing is sent');
  assert.equal(writeQueuedMessage.mock.calls.length, 0, 'and nothing is queued');
  assert.equal(view.result.current.input, 'hello', 'and the draft stays in the composer');
  assert.equal(view.result.current.backgroundSendPrompt, null, 'and the prompt closes');
});

test('queue persists the message behind the work with its uploaded files, sends nothing, and clears the composer', async () => {
  const { view, sends } = render(backgroundOnly);
  await act(async () => {
    view.result.current.setInput('hello');
    view.result.current.setAttachedFiles([new File(['notes'], 'notes.txt', { type: 'text/plain' })]);
  });

  await submitAndAnswer(view, 'queue');

  assert.equal(sends().length, 0, 'queued: nothing is sent now');
  assert.equal(uploads().length, 1, 'the files uploaded before the prompt are not uploaded again');
  // Written synchronously at queue time (and again, identically, by the
  // composer's persistence effect — the same as queueing during a turn).
  assert.ok(writeQueuedMessage.mock.calls.length >= 1);
  assert.equal(writeQueuedMessage.mock.calls[0]?.[0], 'session-1');
  const stored = readQueuedMessage('session-1');
  assert.equal(stored?.content, 'hello');
  assert.deepEqual(stored?.attachments, [UPLOADED]);
  assert.equal(stored?.options?.model, 'test-model');
  assert.equal(view.result.current.queuedDraft?.content, 'hello', 'the queued card shows the message');
  assert.equal(view.result.current.input, '', 'and the composer is cleared, as when queueing during a turn');
  assert.equal(view.result.current.attachedFiles.length, 0);
});

test('send anyway sends the message', async () => {
  const { view, sends } = render(backgroundOnly);
  await act(async () => { view.result.current.setInput('hello'); });

  await submitAndAnswer(view, 'send');

  assert.equal(sends().length, 1);
  assert.equal(writeQueuedMessage.mock.calls.length, 0);
});

test('a second submit while the prompt is open neither opens another prompt nor sends', async () => {
  const { view, sends } = render(backgroundOnly);
  await act(async () => { view.result.current.setInput('hello'); });

  const first = startSubmit(view);
  await waitFor(() => assert.notEqual(view.result.current.backgroundSendPrompt, null));
  const prompt = view.result.current.backgroundSendPrompt;

  await act(async () => {
    await view.result.current.handleSubmit({ preventDefault: () => undefined } as never);
  });
  assert.equal(view.result.current.backgroundSendPrompt, prompt, 'the same prompt is still the open one');
  assert.equal(sends().length, 0);

  await act(async () => {
    view.result.current.resolveBackgroundSendPrompt('cancel');
    await first;
  });
  assert.equal(sends().length, 0, 'exactly zero sends');
});

test('a session with nothing in the background sends without asking', async () => {
  const { view, sends } = render(new Map());
  await act(async () => { view.result.current.setInput('hello'); });
  await act(async () => { await view.result.current.handleSubmit({ preventDefault: () => undefined } as never); });

  assert.equal(view.result.current.backgroundSendPrompt, null);
  assert.equal(sends().length, 1);
});


test('queued card exposes explicit send/insert actions and blocks duplicate clicks while sending', () => {
  const onSendNow = vi.fn();
  const props = { content: 'pending', onEdit: vi.fn(), onDelete: vi.fn(), onSendNow };
  const view = renderComponent(createElement(QueuedMessageCard, props));
  fireEvent.click(screen.getByRole('button', { name: 'Send now' }));
  assert.equal(onSendNow.mock.calls.length, 1);
  view.rerender(createElement(QueuedMessageCard, { ...props, insertIntoActiveRun: true, sending: true }));
  const stop = screen.getByRole('button', { name: 'Insert now' }) as HTMLButtonElement;
  assert.equal(stop.disabled, true);
  fireEvent.click(stop);
  assert.equal(onSendNow.mock.calls.length, 1);
});

test('manual queued send uses the server claim endpoint with saved attachments and never emits another chat.send', async () => {
  const stored = { content: 'manual queue', options: { codexFast: true }, attachments: [UPLOADED] };
  const { writeQueuedMessage: saveQueue } = await import('@/shared/chatDrafts');
  saveQueue(SESSION.id, stored);
  const sendNow = vi.spyOn(api.scheduledMessages, 'sendQueuedNow').mockResolvedValue(new Response(JSON.stringify({ success: true, data: { status: 'sending' } })));
  const { view, sends } = render(new Map());
  await act(async () => { await view.result.current.sendQueuedDraftNow(); });
  assert.equal(sendNow.mock.calls.length, 1);
  assert.deepEqual(sendNow.mock.calls[0], [SESSION.id, stored]);
  assert.equal(sends().length, 0);
});


test('sending during a Codex turn inserts through the native endpoint without starting a second turn', async () => {
  const insertion = vi.spyOn(api.scheduledMessages, 'sendQueuedNow').mockResolvedValue(new Response(JSON.stringify({ success: true, data: { status: 'inserted' } })));
  const { view, sends } = render(new Map(), true);
  await act(async () => { view.result.current.setInput('also check compatibility'); });
  await act(async () => { await view.result.current.handleSubmit({ preventDefault: () => undefined } as never); });
  assert.equal(insertion.mock.calls.length, 1);
  assert.equal(insertion.mock.calls[0][0], SESSION.id);
  assert.equal((insertion.mock.calls[0][1] as { content: string }).content, 'also check compatibility');
  assert.equal(sends().length, 0);
  assert.equal(view.result.current.input, '');
  insertion.mockRestore();
});

test('Shift+Enter during a Codex turn saves a queue without requesting insertion', async () => {
  const insertion = vi.spyOn(api.scheduledMessages, 'sendQueuedNow');
  const { view, sends } = render(new Map(), true);
  await act(async () => { view.result.current.setInput('after this turn'); });
  const preventDefault = vi.fn();
  await act(async () => { view.result.current.handleKeyDown({ key: 'Enter', shiftKey: true, preventDefault } as never); });
  await waitFor(() => assert.equal(view.result.current.queuedDraft?.content, 'after this turn'));
  assert.ok(preventDefault.mock.calls.length > 0);
  assert.equal(insertion.mock.calls.length, 0);
  assert.equal(sends().length, 0);
  insertion.mockRestore();
});

test('rejected insertion keeps the message and displays the failure without another chat.send', async () => {
  const insertion = vi.spyOn(api.scheduledMessages, 'sendQueuedNow').mockResolvedValue(new Response(JSON.stringify({ error: 'Turn changed' }), { status: 409 }));
  const { view, sends } = render(new Map(), true);
  await act(async () => { view.result.current.setInput('retain on failure'); });
  await act(async () => { await view.result.current.handleSubmit({ preventDefault: () => undefined } as never); });
  assert.equal(view.result.current.queuedDraft?.content, 'retain on failure');
  assert.ok(view.result.current.queuedSendError);
  assert.equal(sends().length, 0);
  insertion.mockRestore();
});
