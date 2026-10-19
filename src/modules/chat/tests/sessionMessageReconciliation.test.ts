import { assert, test } from 'vitest';

import type { NormalizedMessage } from '@/shared/types';
import { removeOptimisticUserEchoes } from '@/modules/chat/utils/sessionMessageReconciliation';

const createUserMessage = (
  id: string,
  timestamp: string,
  overrides: Partial<NormalizedMessage> = {},
): NormalizedMessage => ({
  id,
  sessionId: 'session-1',
  timestamp,
  provider: 'claude',
  kind: 'text',
  role: 'user',
  content: '',
  ...overrides,
});

test('replaces an optimistic image-only turn with its persisted Claude copy', () => {
  const local = createUserMessage('local_image', '2026-07-28T20:30:21.000Z', {
    images: [{ path: 'C:/Users/test/.cloudcli/assets/upload.png', name: 'image.png' }],
  });
  const persisted = createUserMessage('claude_image', '2026-07-28T20:30:26.000Z', {
    images: [{ data: 'data:image/png;base64,AAAA' }],
  });

  assert.deepEqual(removeOptimisticUserEchoes([persisted], [local]), []);
});

test('does not collapse an attachment-only turn into a server row without attachments', () => {
  const local = createUserMessage('local_image', '2026-07-28T20:30:21.000Z', {
    images: [{ path: 'C:/Users/test/.cloudcli/assets/upload.png' }],
  });
  const persisted = createUserMessage('claude_empty', '2026-07-28T20:30:22.000Z');

  assert.deepEqual(removeOptimisticUserEchoes([persisted], [local]), [local]);
});

test('matches optimistic attachment turns to persisted turns one-to-one', () => {
  const firstLocal = createUserMessage('local_first', '2026-07-28T20:30:21.000Z', {
    images: [{ path: 'C:/Users/test/.cloudcli/assets/first.png' }],
  });
  const secondLocal = createUserMessage('local_second', '2026-07-28T20:30:25.000Z', {
    images: [{ path: 'C:/Users/test/.cloudcli/assets/second.png' }],
  });
  const firstPersisted = createUserMessage('claude_first', '2026-07-28T20:30:22.000Z', {
    images: [{ data: 'data:image/png;base64,AAAA' }],
  });

  const remainingRealtime = removeOptimisticUserEchoes(
    [firstPersisted],
    [firstLocal, secondLocal],
  );

  assert.deepEqual(remainingRealtime.map((message) => message.id), ['local_second']);
});

test('keeps the existing optimistic text reconciliation behavior', () => {
  const local = createUserMessage('local_text', '2026-07-28T20:30:21.000Z', {
    content: 'hello',
  });
  const persisted = createUserMessage('claude_text', '2026-07-28T20:30:26.000Z', {
    content: 'hello',
  });

  assert.deepEqual(removeOptimisticUserEchoes([persisted], [local]), []);
});

test('retires a steered Codex echo when history backdates it to the start of the turn', () => {
  const turnStart = '2026-10-13T02:13:58.000Z';
  const insertedAt = '2026-10-13T02:17:55.000Z';
  const original = createUserMessage('original', turnStart, {
    provider: 'codex', content: 'build the dashboard', transcriptAnchorId: 'turn-1',
  });
  const persisted = createUserMessage('steered', turnStart, {
    provider: 'codex', content: 'support macOS',
  });
  const local = createUserMessage('local_queue_abc', insertedAt, {
    provider: 'codex', content: 'support macOS',
  });

  assert.deepEqual(removeOptimisticUserEchoes([original, persisted], [local]), []);
  assert.deepEqual(removeOptimisticUserEchoes([original], [local]), [local]);
});

test('a steered echo cannot claim the first prompt of a previous Codex turn', () => {
  const persisted = createUserMessage('original', '2026-10-13T02:13:58.000Z', {
    provider: 'codex', content: 'support macOS', transcriptAnchorId: 'turn-1',
  });
  const local = createUserMessage('local_queue_abc', '2026-10-13T02:17:55.000Z', {
    provider: 'codex', content: 'support macOS',
  });

  assert.deepEqual(removeOptimisticUserEchoes([persisted], [local]), [local]);
});

test('backdated steering matches are one-to-one for repeated input', () => {
  const persisted = createUserMessage('steered', '2026-10-13T02:13:58.000Z', {
    provider: 'codex', content: 'continue',
  });
  const first = createUserMessage('local_queue_first', '2026-10-13T02:17:55.000Z', {
    provider: 'codex', content: 'continue',
  });
  const second = createUserMessage('local_queue_second', '2026-10-13T02:18:55.000Z', {
    provider: 'codex', content: 'continue',
  });

  assert.deepEqual(removeOptimisticUserEchoes([persisted], [first, second]), [second]);
});

test('a matching steer from an older turn does not retire input in the newest turn', () => {
  const oldSteer = createUserMessage('old-steer', '2026-10-13T02:00:00.000Z', {
    provider: 'codex', content: 'continue',
  });
  const currentPrompt = createUserMessage('current-prompt', '2026-10-13T02:13:58.000Z', {
    provider: 'codex', content: 'build the dashboard', transcriptAnchorId: 'turn-2',
  });
  const local = createUserMessage('local_queue_second', '2026-10-13T02:17:55.000Z', {
    provider: 'codex', content: 'continue',
  });

  assert.deepEqual(removeOptimisticUserEchoes([oldSteer, currentPrompt], [local]), [local]);
});

test('a replacement echo survives a kept turn that repeats its text', () => {
  // The exact shape a rewind that branches produces: the turn that survived
  // the cut is re-stamped to the moment of the copy, one second before the
  // replacement was typed, and happens to say the same thing the user just
  // corrected their message to.
  const userRow = (id: string, content: string, timestamp: string) => ({
    id,
    kind: 'text',
    role: 'user',
    provider: 'codex',
    sessionId: 's1',
    content,
    timestamp,
  }) as NormalizedMessage;

  const kept = [userRow('kept', 'continue', '2026-01-01T00:00:21.000Z')];
  const echo = {
    ...userRow('local_1', 'continue', '2026-01-01T00:00:20.000Z'),
    replacesAnchorId: 'turn-b',
    replacesAfterRowCount: kept.length,
  } as NormalizedMessage;

  assert.deepEqual(removeOptimisticUserEchoes(kept, [echo]), [echo]);

  // Once the provider has written the replacement, it is a row the cut did not
  // keep, so it retires the echo.
  const persisted = [...kept, userRow('persisted', 'continue', '2026-01-01T00:00:25.000Z')];
  assert.deepEqual(removeOptimisticUserEchoes(persisted, [echo]), []);
});
