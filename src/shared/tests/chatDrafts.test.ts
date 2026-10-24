import assert from 'node:assert/strict';

import { afterEach, beforeEach, test, vi } from 'vitest';

/**
 * Drafts moved out of the browser and into auth.db so a message half-typed on
 * one device can be finished on another — the case the composer could not serve
 * at all before, because a draft only existed on the machine it was typed on.
 *
 * Each test loads a fresh module copy, because the store reads its localStorage
 * mirror once at module scope.
 */

type SavedDraft = { scope: string; text: string; queuedMessage?: unknown };

const savedDrafts: SavedDraft[] = [];
const deletedScopes: string[] = [];
let serverDrafts: unknown[] = [];
let draftsRequestFailed = false;
let saveBarrier: Promise<void> | null = null;
let readBarrier: Promise<void> | null = null;
let saveStatus = 200;
let draftReadCount = 0;

vi.mock('@/shared/api', () => ({
  api: {
    user: {
      drafts: async () => {
        draftReadCount += 1;
        if (draftsRequestFailed) {
          throw new Error('offline');
        }
        if (readBarrier) await readBarrier;
        return new Response(JSON.stringify({ success: true, drafts: serverDrafts }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
      saveDraft: async (scope: string, draft: { text: string; queuedMessage?: unknown }) => {
        savedDrafts.push({ scope, ...draft });
        if (saveBarrier) await saveBarrier;
        return new Response('{}', { status: saveStatus });
      },
      deleteDraft: async (scope: string) => {
        deletedScopes.push(scope);
        return new Response('{}', { status: 200 });
      },
    },
  },
}));

const loadStore = async () => {
  vi.resetModules();
  return import('@/shared/chatDrafts');
};

beforeEach(() => {
  localStorage.clear();
  savedDrafts.length = 0;
  deletedScopes.length = 0;
  serverDrafts = [];
  draftsRequestFailed = false;
  saveBarrier = null;
  readBarrier = null;
  saveStatus = 200;
  draftReadCount = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('a draft is readable synchronously and reaches the server after the debounce', async () => {
  const store = await loadStore();

  store.writeDraftText('session-a', 'half a thought');

  assert.equal(store.readDraftText('session-a'), 'half a thought');
  assert.deepEqual(savedDrafts, [], 'the request must not fire on every keystroke');

  await vi.advanceTimersByTimeAsync(1_500);
  assert.deepEqual(savedDrafts, [
    { scope: 'session-a', text: 'half a thought' },
  ]);
});

test('concurrent hydrations coalesce and an old account response cannot replace a new account', async () => {
  let release!: () => void;
  readBarrier = new Promise<void>((resolve) => { release = resolve; });
  const store = await loadStore();
  const old = store.hydrateChatDrafts();
  const duplicate = store.hydrateChatDrafts();
  assert.equal(draftReadCount, 1);
  store.resetChatDrafts();
  readBarrier = null;
  serverDrafts = [{ scope: 'new-account', text: 'new draft' }];
  await store.hydrateChatDrafts();
  assert.equal(draftReadCount, 2);
  serverDrafts = [{ scope: 'old-account', text: 'old draft' }];
  release();
  await Promise.all([old, duplicate]);
  assert.equal(store.readDraftText('new-account'), 'new draft');
  assert.equal(store.readDraftText('old-account'), '');
});

test('each session keeps its own draft', async () => {
  const store = await loadStore();

  store.writeDraftText('session-a', 'for A');
  store.writeDraftText('session-b', 'for B');

  assert.equal(store.readDraftText('session-a'), 'for A');
  assert.equal(store.readDraftText('session-b'), 'for B');
});

test('a chat with no session yet is scoped to its project', async () => {
  const store = await loadStore();

  store.writeDraftText('project:p1', 'unsent');

  assert.equal(store.readDraftText('project:p1'), 'unsent');
  assert.equal(store.readDraftText('session-a'), '');
});

test('clearing typed text does not delete a server-owned queued message', async () => {
  const store = await loadStore();
  store.writeDraftText('session-a', 'typed');
  await vi.advanceTimersByTimeAsync(1_500);
  savedDrafts.length = 0;

  store.writeDraftText('session-a', '');
  await vi.advanceTimersByTimeAsync(1_500);

  assert.deepEqual(savedDrafts, [{ scope: 'session-a', text: '' }]);
  assert.deepEqual(deletedScopes, []);
});

test('a draft written in one page load is readable synchronously in the next', async () => {
  const first = await loadStore();
  first.writeDraftText('session-a', 'survives a reload');

  // No hydrate: this is the first paint of the next load, before any request
  // could have resolved.
  const second = await loadStore();
  assert.equal(second.readDraftText('session-a'), 'survives a reload');
});

test('hydrate brings in a draft typed on another device', async () => {
  serverDrafts = [{ scope: 'session-a', text: 'typed on the laptop', queuedMessage: null }];

  const store = await loadStore();
  await store.hydrateChatDrafts();

  assert.equal(store.readDraftText('session-a'), 'typed on the laptop');
});

test('hydrate removes a mirrored queue after the server claims it', async () => {
  const store = await loadStore();
  store.writeQueuedMessage('session-a', { content: 'server-owned queue' });
  assert.equal(store.readQueuedMessage('session-a')?.content, 'server-owned queue');

  serverDrafts = [];
  await store.hydrateChatDrafts();

  assert.equal(store.readQueuedMessage('session-a'), null);
});

test('hydrate does not overwrite a scope the user is typing into right now', async () => {
  serverDrafts = [{ scope: 'session-a', text: 'stale server copy', queuedMessage: null }];

  const store = await loadStore();
  store.writeDraftText('session-a', 'what I am writing');
  await store.hydrateChatDrafts();

  assert.equal(store.readDraftText('session-a'), 'what I am writing');
});

test('a failed hydrate keeps the mirrored draft rather than blanking the composer', async () => {
  const store = await loadStore();
  store.writeDraftText('session-a', 'local work');
  await vi.advanceTimersByTimeAsync(1_500);

  draftsRequestFailed = true;
  await store.hydrateChatDrafts();

  assert.equal(store.readDraftText('session-a'), 'local work');
});

test('a queued message round-trips alongside the draft text', async () => {
  const store = await loadStore();

  store.writeDraftText('session-a', 'still editing');
  store.writeQueuedMessage('session-a', { content: 'send this next', attachments: [] });

  assert.equal(store.readDraftText('session-a'), 'still editing');
  assert.deepEqual(store.readQueuedMessage('session-a'), {
    content: 'send this next',
    attachments: [],
  });
  assert.equal(savedDrafts.length, 1, 'queue actions persist without waiting for the draft debounce');
  assert.deepEqual(savedDrafts, [{
    scope: 'session-a',
    text: 'still editing',
    queuedMessage: { content: 'send this next', attachments: [] },
  }]);
});

test('a queued message with neither text nor attachments reads as absent', async () => {
  const store = await loadStore();

  store.writeQueuedMessage('session-a', { content: '   ', attachments: [] });

  assert.equal(store.readQueuedMessage('session-a'), null);
});

test('legacy image-only descriptors are still readable as attachments', async () => {
  const store = await loadStore();

  store.writeQueuedMessage('session-a', { content: '', images: [{ name: 'shot.png' }] });

  assert.deepEqual(store.readQueuedMessage('session-a')?.attachments, [{ name: 'shot.png' }]);
});

test('clearing the queued message leaves the draft text alone', async () => {
  const store = await loadStore();
  store.writeDraftText('session-a', 'keep me');
  store.writeQueuedMessage('session-a', { content: 'queued' });

  store.clearQueuedMessage('session-a');

  assert.equal(store.readQueuedMessage('session-a'), null);
  assert.equal(store.readDraftText('session-a'), 'keep me');
});

test('subscribers are notified on a write', async () => {
  const store = await loadStore();
  const listener = vi.fn();
  const unsubscribe = store.subscribeToChatDrafts(listener);

  store.writeDraftText('session-a', 'typed');
  assert.equal(listener.mock.calls.length, 1);

  // Writing the same text again changes nothing, so nobody is woken.
  store.writeDraftText('session-a', 'typed');
  assert.equal(listener.mock.calls.length, 1);

  unsubscribe();
  store.writeDraftText('session-a', 'more');
  assert.equal(listener.mock.calls.length, 1);
});

test('reset clears the drafts so the next user does not see them', async () => {
  const store = await loadStore();
  store.writeDraftText('session-a', 'private');

  store.resetChatDrafts();

  assert.equal(store.readDraftText('session-a'), '');
  assert.equal(localStorage.getItem('chat-drafts'), null);
});


test('hydrate cannot discard a queued message before its save is acknowledged', async () => {
  let release!: () => void;
  saveBarrier = new Promise<void>((resolve) => { release = resolve; });
  const store = await loadStore();
  store.writeQueuedMessage('session-a', { content: 'not acknowledged yet' });
  await store.hydrateChatDrafts();
  assert.equal(store.readQueuedMessage('session-a')?.content, 'not acknowledged yet');
  release();
  await store.persistChatDraft('session-a');
});

test('a stale GET cannot erase a queue saved after that GET started', async () => {
  let release!: () => void;
  readBarrier = new Promise<void>((resolve) => { release = resolve; });
  const store = await loadStore();
  const hydration = store.hydrateChatDrafts();
  store.writeQueuedMessage('session-a', { content: 'newer than GET' });
  await store.persistChatDraft('session-a');
  release();
  await hydration;
  assert.equal(store.readQueuedMessage('session-a')?.content, 'newer than GET');
});

test('HTTP save errors retain the queue and a later retry can persist it', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const store = await loadStore();
  saveStatus = 500;
  store.writeQueuedMessage('session-a', { content: 'keep on failure' });
  await assert.rejects(store.persistChatDraft('session-a'), /500/);
  await store.hydrateChatDrafts();
  assert.equal(store.readQueuedMessage('session-a')?.content, 'keep on failure');
  saveStatus = 200;
  await store.persistChatDraft('session-a');
  const saved = savedDrafts.at(-1)?.queuedMessage as { content: string } | undefined;
  assert.equal(saved?.content, 'keep on failure');
});

test('cancel is serialized after an outstanding queue save, so a late PUT cannot revive it', async () => {
  let release!: () => void;
  saveBarrier = new Promise<void>((resolve) => { release = resolve; });
  const store = await loadStore();
  store.writeQueuedMessage('session-a', { content: 'cancel this' });
  store.clearQueuedMessage('session-a');
  assert.deepEqual(deletedScopes, []);
  release();
  await store.persistChatDraft('session-a');
  assert.deepEqual(deletedScopes, ['session-a']);
  assert.equal(store.readQueuedMessage('session-a'), null);
});


test('typing after a queue save does not repost a potentially consumed message', async () => {
  const store = await loadStore();
  store.writeQueuedMessage('session-a', { content: 'sent once' });
  await store.persistChatDraft('session-a');
  store.writeDraftText('session-a', 'typing the following message');
  await store.persistChatDraft('session-a');
  assert.deepEqual(savedDrafts.at(-1), { scope: 'session-a', text: 'typing the following message' });
});
