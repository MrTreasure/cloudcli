import assert from 'node:assert/strict';

import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';

import '@/modules/i18n';
import type { NormalizedMessage } from '@/shared/types';
import { normalizedToChatMessages } from '@/modules/chat/hooks/useChatMessages';
import { ToolRenderer } from '@/modules/chat/tools/ToolRenderer';

/**
 * When an already-sent message is replaced, every client watching the session
 * drops the superseded turns before the replacement streams in — otherwise the
 * transcript shows the question twice until the next REST refresh.
 */

const sessionMessages = vi.fn();

vi.mock('@/shared/api', () => ({
  api: {
    providers: {
      sessionMessages: (...args: unknown[]) => sessionMessages(...args),
    },
  },
}));

const row = (id: string, content: string, anchor?: string): NormalizedMessage => ({
  id,
  kind: 'text',
  role: anchor ? 'user' : 'assistant',
  provider: 'claude',
  sessionId: 'session-1',
  content,
  timestamp: `2026-01-01T00:00:0${id}.000Z`,
  ...(anchor ? { transcriptAnchorId: anchor } : {}),
} as NormalizedMessage);

const HISTORY = [
  row('1', 'first prompt', 'u1'),
  row('2', 'first answer'),
  row('3', 'second prompt', 'u2'),
  row('4', 'second answer'),
];

beforeEach(() => {
  sessionMessages.mockReset();
  sessionMessages.mockResolvedValue({
    ok: true,
    json: async () => ({ data: { messages: HISTORY, total: HISTORY.length, hasMore: false } }),
  });
});

afterEach(() => {
  vi.resetModules();
});

async function loadedStore() {
  const { useSessionStore } = await import('@/modules/chat/hooks/useSessionStore');
  const view = renderHook(() => useSessionStore());
  await act(async () => {
    await view.result.current.fetchFromServer('session-1', { limit: 20, offset: 0 });
  });
  return view;
}

describe('live checklist snapshots', () => {
  const plan = (id: string, status = 'in_progress'): NormalizedMessage => ({
    id, sessionId: 'session-1', timestamp: '2026-01-01T00:00:05.000Z',
    kind: 'tool_use', provider: 'codex', toolName: 'TodoWrite', toolId: id,
    toolInput: { todos: [
      { content: 'Inspect', status: 'completed' },
      { content: 'Implement', status },
      { content: 'Verify', status: 'pending' },
    ] },
    status: 'completed', toolResult: { content: '', isError: false },
  });

  it('replaces a same-id snapshot in place without moving it past newer messages', async () => {
    const { result } = await loadedStore();
    const id = 'codex-plan:thread-1:turn-1';
    act(() => {
      result.current.appendRealtime('session-1', plan(id));
      result.current.appendRealtime('session-1', row('6', 'Later explanation'));
      result.current.appendRealtime('session-1', { ...plan(id, 'completed'), timestamp: '2026-01-01T00:00:09.000Z' });
    });
    const messages = result.current.getMessages('session-1');
    assert.deepEqual(messages.map((message) => message.id), ['1', '2', '3', '4', id, '6']);
    assert.equal(messages[4].timestamp, '2026-01-01T00:00:05.000Z');
    assert.deepEqual(messages[4].toolInput, plan(id, 'completed').toolInput);
    assert.equal(result.current.getSessionSlot('session-1')?.realtimeMessages.filter((message) => message.id === id).length, 1);
  });

  it('isolates same-id updates by session and keeps a separate checklist for each turn', async () => {
    const { result } = await loadedStore();
    const id = 'codex-plan:thread-1:turn-1';
    act(() => {
      result.current.appendRealtime('session-1', plan(id));
      result.current.appendRealtime('session-2', plan(id));
      result.current.appendRealtime('session-1', plan(id, 'completed'));
      result.current.appendRealtime('session-1', plan('codex-plan:thread-1:turn-2'));
    });
    const first = result.current.getMessages('session-1').filter((message) => message.toolName === 'TodoWrite');
    const second = result.current.getMessages('session-2');
    assert.equal(first.length, 2);
    assert.deepEqual(first[0].toolInput, plan(id, 'completed').toolInput);
    assert.equal(second.length, 1);
    assert.equal(second[0].sessionId, 'session-2');
    assert.deepEqual(second[0].toolInput, plan(id).toolInput);
  });

  it('renders one real checklist card with three states, then updates it without a Running write badge', async () => {
    const { result } = await loadedStore();
    const id = 'codex-plan:thread-1:turn-1';
    act(() => result.current.appendRealtime('session-1', plan(id)));
    const cards = () => normalizedToChatMessages(result.current.getMessages('session-1'))
      .filter((message) => message.toolName === 'TodoWrite')
      .map((message) => <ToolRenderer key={message.toolId} mode="input" toolName="TodoWrite"
        toolInput={message.toolInput} toolId={message.toolId} toolResult={message.toolResult} toolStatus={message.toolStatus} />);
    const view = render(<>{cards()}</>);
    const list = view.getByRole('list');
    assert.deepEqual(view.getAllByRole('listitem').map((item) => item.getAttribute('data-status')), ['completed', 'in_progress', 'pending']);
    assert.equal(view.queryByText('Running'), null);
    assert.ok(view.getByText('Implement — 1/3'));

    act(() => result.current.appendRealtime('session-1', plan(id, 'completed')));
    view.rerender(<>{cards()}</>);
    assert.equal(view.getAllByRole('list').length, 1);
    assert.strictEqual(view.getByRole('list'), list, 'keep the existing card mounted');
    assert.deepEqual(view.getAllByRole('listitem').map((item) => item.getAttribute('data-status')), ['completed', 'completed', 'pending']);
    assert.ok(view.getByText('2/3 done'));
    assert.equal(view.queryByText('Running'), null);
    assert.equal(view.queryByText('Done — 3/3'), null);
  });
});

describe('truncateAt', () => {
  it('drops the anchored message and everything after it', async () => {
    const { result } = await loadedStore();

    act(() => {
      result.current.truncateAt('session-1', 'u2');
    });

    assert.deepEqual(
      result.current.getMessages('session-1').map((message) => message.content),
      ['first prompt', 'first answer'],
    );
  });

  it('keeps a message whose anchor was not the cut point', async () => {
    const { result } = await loadedStore();

    act(() => {
      result.current.truncateAt('session-1', 'u1');
    });

    assert.deepEqual(result.current.getMessages('session-1'), []);
  });

  it('leaves the transcript alone for an anchor it does not hold', async () => {
    const { result } = await loadedStore();

    act(() => {
      result.current.truncateAt('session-1', 'not-here');
    });

    assert.equal(result.current.getMessages('session-1').length, 4);
  });

  it('clears rows that streamed for the turn being replaced', async () => {
    const { result } = await loadedStore();

    act(() => {
      result.current.appendRealtime('session-1', row('5', 'streaming reply'));
    });
    assert.equal(result.current.getMessages('session-1').length, 5);

    act(() => {
      result.current.truncateAt('session-1', 'u2');
    });

    assert.deepEqual(
      result.current.getMessages('session-1').map((message) => message.content),
      ['first prompt', 'first answer'],
    );
  });

  it('keeps the replacement the cut was made for', async () => {
    const { result } = await loadedStore();

    // The composer appends its echo of the edited message before the server
    // acknowledges the edit, so the cut arrives with the replacement already
    // on screen. Clearing it left the chat pane without the message the user
    // had just sent until the run finished.
    act(() => {
      result.current.appendRealtime('session-1', {
        ...row('5', 'second prompt, corrected'),
        role: 'user',
        replacesAnchorId: 'u2',
      } as NormalizedMessage);
    });

    act(() => {
      result.current.truncateAt('session-1', 'u2');
    });

    assert.deepEqual(
      result.current.getMessages('session-1').map((message) => message.content),
      ['first prompt', 'first answer', 'second prompt, corrected'],
    );
  });

  it('keeps the replacement last when the kept history comes back re-stamped', async () => {
    const { result } = await loadedStore();

    act(() => {
      result.current.appendRealtime('session-1', {
        ...row('5', 'second prompt, corrected'),
        role: 'user',
        replacesAnchorId: 'u2',
      } as NormalizedMessage);
      result.current.truncateAt('session-1', 'u2');
    });

    // A provider that rewinds by branching writes the surviving turns into a
    // fresh transcript, so the next refresh returns them stamped later than
    // the replacement was typed. Without a floor on where a replacement can
    // sort, the message the user just sent moves to the top.
    sessionMessages.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          messages: [
            { ...row('1', 'first prompt', 'u1'), timestamp: '2026-01-01T00:00:09.000Z' },
            { ...row('2', 'first answer'), timestamp: '2026-01-01T00:00:09.001Z' },
          ],
          total: 2,
          hasMore: false,
        },
      }),
    });

    await act(async () => {
      await result.current.refreshLatestFromServer('session-1');
    });

    assert.deepEqual(
      result.current.getMessages('session-1').map((message) => message.content),
      ['first prompt', 'first answer', 'second prompt, corrected'],
    );
  });

  it('keeps only the newest replacement when an earlier attempt was refused', async () => {
    const { result } = await loadedStore();

    // A refused send leaves its echo in place — nothing rolls it back — so by
    // the time an edit succeeds the store can be holding two attempts at the
    // same message.
    act(() => {
      result.current.appendRealtime('session-1', {
        ...row('5', 'first attempt'),
        role: 'user',
        replacesAnchorId: 'u2',
      } as NormalizedMessage);
      result.current.appendRealtime('session-1', {
        ...row('6', 'second attempt'),
        role: 'user',
        replacesAnchorId: 'u2',
      } as NormalizedMessage);
      result.current.truncateAt('session-1', 'u2');
    });

    assert.deepEqual(
      result.current.getMessages('session-1').map((message) => message.content),
      ['first prompt', 'first answer', 'second attempt'],
    );
  });

  it('clears a replacement tagged for a different cut', async () => {
    const { result } = await loadedStore();

    act(() => {
      result.current.appendRealtime('session-1', {
        ...row('5', 'first prompt, corrected'),
        role: 'user',
        replacesAnchorId: 'u1',
      } as NormalizedMessage);
    });

    act(() => {
      result.current.truncateAt('session-1', 'u2');
    });

    assert.deepEqual(
      result.current.getMessages('session-1').map((message) => message.content),
      ['first prompt', 'first answer'],
    );
  });
});
