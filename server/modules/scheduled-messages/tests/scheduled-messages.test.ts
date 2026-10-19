import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { closeConnection, initializeDatabase, scheduledMessagesDb, sessionDraftsDb, sessionsDb, userDb } from '@/modules/database/index.js';
import { initializeScheduledMessageDispatcher, closeScheduledMessageDispatcher, sendQueuedMessageNow, dispatchDueScheduledMessages, dispatchQueuedMessages } from '@/modules/scheduled-messages/services/scheduled-message-dispatcher.service.js';
import { scheduledMessagesService } from '@/modules/scheduled-messages/services/scheduled-messages.service.js';
import type { ProviderRuntimeGateway } from '@/modules/websocket/index.js';
import { chatRunRegistry } from '@/modules/websocket/index.js';

const SESSION_ID = 'scheduled-session';

async function withIsolatedDatabase(runTest: (userId: number) => void | Promise<void>): Promise<void> {
  const previousDatabasePath = process.env.DATABASE_PATH;
  const tempDirectory = await mkdtemp(path.join(tmpdir(), 'scheduled-messages-'));

  closeConnection();
  process.env.DATABASE_PATH = path.join(tempDirectory, 'auth.db');
  await initializeDatabase();

  try {
    const user = userDb.createUser('scheduler', 'hash');
    sessionsDb.createAppSession(SESSION_ID, 'claude', tempDirectory, 'Scheduled session');
    await runTest(Number(user.id));
  } finally {
    chatRunRegistry.clearAll();
    closeConnection();
    if (previousDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = previousDatabasePath;
    }
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

type RunCall = { provider: string; command: string; options: Record<string, unknown> };

function createRuntime(
  runs: RunCall[],
  behaviour: 'ok' | 'throw' = 'ok',
  aborts: string[] = [],
  hasBackgroundWork: (sessionId: string) => boolean = () => false,
) {
  return {
    hasRuntime: () => true,
    hasBackgroundWork,
    run: async (provider: string, command: string, options: Record<string, unknown>) => {
      if (behaviour === 'throw') {
        throw new Error('provider exploded');
      }
      runs.push({ provider, command, options });
    },
    abort: async (_provider: string, sessionId: string) => {
      aborts.push(sessionId);
      return true;
    },
  } as never;
}

test('a message due in the past is sent on the next pass, not skipped', async () => {
  await withIsolatedDatabase(async (userId) => {
    // The server was down when this came due.
    scheduledMessagesService.schedule({
      userId,
      sessionId: SESSION_ID,
      content: 'run the nightly checks',
      scheduledFor: new Date(Date.now() - 60_000).toISOString(),
    });

    const runs: RunCall[] = [];
    const sent = await dispatchDueScheduledMessages(createRuntime(runs));

    assert.equal(sent, 1);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].command, 'run the nightly checks');
    assert.equal(scheduledMessagesDb.listForSession(userId, SESSION_ID)[0].status, 'sent');
  });
});

test('a queued message is sent by the server without a browser connection', async () => {
  await withIsolatedDatabase(async (userId) => {
    sessionDraftsDb.saveDraft(userId, SESSION_ID, {
      text: '',
      queuedMessage: {
        content: 'continue on the VPS',
        options: { model: 'claude-opus-5' },
        attachments: [{ path: '/tmp/upload.png' }],
      },
    });

    const runs: RunCall[] = [];
    assert.equal(await dispatchQueuedMessages(createRuntime(runs)), 1);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].command, 'continue on the VPS');
    assert.equal(runs[0].options.model, 'claude-opus-5');
    assert.deepEqual(runs[0].options.attachments, []);
    assert.equal(sessionDraftsDb.getDrafts(userId).length, 0);
  });
});

test('a queued message stays pending while its session is busy', async () => {
  await withIsolatedDatabase(async (userId) => {
    sessionDraftsDb.saveDraft(userId, SESSION_ID, {
      text: '',
      queuedMessage: { content: 'send after this run' },
    });
    chatRunRegistry.startRun({
      appSessionId: SESSION_ID,
      provider: 'claude',
      providerSessionId: null,
      connection: null,
      userId,
    });

    const runs: RunCall[] = [];
    assert.equal(await dispatchQueuedMessages(createRuntime(runs)), 0);
    assert.equal(runs.length, 0);
    assert.deepEqual(sessionDraftsDb.getDrafts(userId)[0]?.queuedMessage, {
      content: 'send after this run',
    });
  });
});

test('a queued message waits for background work its session\'s last turn left running', async () => {
  await withIsolatedDatabase(async (userId) => {
    sessionDraftsDb.saveDraft(userId, SESSION_ID, {
      text: '',
      queuedMessage: { content: 'send after the background job' },
    });
    // Turn A ended, so its run is completed, but it backgrounded a command
    // that is still running under A's CLI process.
    const runA = chatRunRegistry.startRun({
      appSessionId: SESSION_ID,
      provider: 'claude',
      providerSessionId: null,
      connection: null,
      userId,
    });
    runA!.writer.sendComplete({ exitCode: 0 });
    assert.equal(chatRunRegistry.isProcessing(SESSION_ID), false);

    let backgroundWork = true;
    const runs: RunCall[] = [];
    const runtime = createRuntime(runs, 'ok', [], (sessionId) => sessionId === SESSION_ID && backgroundWork);

    // Starting B now would replace that process and stop the command.
    assert.equal(await dispatchQueuedMessages(runtime), 0);
    assert.equal(runs.length, 0);
    assert.deepEqual(sessionDraftsDb.getDrafts(userId)[0]?.queuedMessage, {
      content: 'send after the background job',
    });

    // Once the work has reported back, B goes on the next pass.
    backgroundWork = false;
    assert.equal(await dispatchQueuedMessages(runtime), 1);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].command, 'send after the background job');
    assert.equal(sessionDraftsDb.getDrafts(userId).length, 0);
  });
});

test('a due message interrupts a run in progress instead of failing', async () => {
  await withIsolatedDatabase(async (userId) => {
    scheduledMessagesService.schedule({
      userId,
      sessionId: SESSION_ID,
      content: 'the schedule wins',
      scheduledFor: new Date(Date.now() - 1_000).toISOString(),
    });
    chatRunRegistry.startRun({
      appSessionId: SESSION_ID,
      provider: 'claude',
      providerSessionId: null,
      connection: null,
      userId,
    });

    const runs: RunCall[] = [];
    const aborts: string[] = [];
    assert.equal(await dispatchDueScheduledMessages(createRuntime(runs, 'ok', aborts)), 1);

    assert.deepEqual(aborts, [SESSION_ID]);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].command, 'the schedule wins');
    assert.equal(scheduledMessagesDb.listForSession(userId, SESSION_ID)[0].status, 'sent');
  });
});

test('a message that is not due yet is left alone', async () => {
  await withIsolatedDatabase(async (userId) => {
    scheduledMessagesService.schedule({
      userId,
      sessionId: SESSION_ID,
      content: 'later',
      scheduledFor: new Date(Date.now() + 3_600_000).toISOString(),
    });

    const runs: RunCall[] = [];
    assert.equal(await dispatchDueScheduledMessages(createRuntime(runs)), 0);
    assert.equal(runs.length, 0);
    assert.equal(scheduledMessagesDb.listForSession(userId, SESSION_ID)[0].status, 'pending');
  });
});

test('a due message is claimed once, so overlapping passes cannot double-send it', async () => {
  await withIsolatedDatabase(async (userId) => {
    scheduledMessagesService.schedule({
      userId,
      sessionId: SESSION_ID,
      content: 'only once',
      scheduledFor: new Date(Date.now() - 1_000).toISOString(),
    });

    const runs: RunCall[] = [];
    const runtime = createRuntime(runs);
    await Promise.all([
      dispatchDueScheduledMessages(runtime),
      dispatchDueScheduledMessages(runtime),
    ]);

    assert.equal(runs.length, 1);
  });
});

test('the composer settings it was scheduled with travel with it', async () => {
  await withIsolatedDatabase(async (userId) => {
    scheduledMessagesService.schedule({
      userId,
      sessionId: SESSION_ID,
      content: 'with options',
      options: { model: 'claude-opus-5', permissionMode: 'plan' },
      scheduledFor: new Date(Date.now() - 1_000).toISOString(),
    });

    const runs: RunCall[] = [];
    await dispatchDueScheduledMessages(createRuntime(runs));

    assert.equal(runs[0].options.model, 'claude-opus-5');
    assert.equal(runs[0].options.permissionMode, 'plan');
  });
});

test('a provider failure is recorded on the message instead of vanishing', async () => {
  await withIsolatedDatabase(async (userId) => {
    scheduledMessagesService.schedule({
      userId,
      sessionId: SESSION_ID,
      content: 'will fail',
      scheduledFor: new Date(Date.now() - 1_000).toISOString(),
    });

    await dispatchDueScheduledMessages(createRuntime([], 'throw'));

    const row = scheduledMessagesDb.listForSession(userId, SESSION_ID)[0];
    assert.equal(row.status, 'failed');
    assert.match(row.failure_reason ?? '', /provider exploded/);
  });
});

test('a cancelled message never fires', async () => {
  await withIsolatedDatabase(async (userId) => {
    const scheduled = scheduledMessagesService.schedule({
      userId,
      sessionId: SESSION_ID,
      content: 'never mind',
      scheduledFor: new Date(Date.now() - 1_000).toISOString(),
    });
    scheduledMessagesService.cancel(userId, scheduled.id);

    const runs: RunCall[] = [];
    assert.equal(await dispatchDueScheduledMessages(createRuntime(runs)), 0);
    assert.equal(runs.length, 0);
  });
});

test('a failed message can be dismissed, and stays dismissed', async () => {
  await withIsolatedDatabase(async (userId) => {
    const scheduled = scheduledMessagesService.schedule({
      userId,
      sessionId: SESSION_ID,
      content: 'will fail',
      scheduledFor: new Date(Date.now() - 1_000).toISOString(),
    });
    await dispatchDueScheduledMessages(createRuntime([], 'throw'));
    assert.equal(scheduledMessagesDb.listForSession(userId, SESSION_ID)[0].status, 'failed');

    scheduledMessagesService.cancel(userId, scheduled.id);

    assert.equal(scheduledMessagesDb.listForSession(userId, SESSION_ID)[0].status, 'cancelled');
  });
});

test('cancelling something that already fired is refused', async () => {
  await withIsolatedDatabase(async (userId) => {
    const scheduled = scheduledMessagesService.schedule({
      userId,
      sessionId: SESSION_ID,
      content: 'gone',
      scheduledFor: new Date(Date.now() - 1_000).toISOString(),
    });
    await dispatchDueScheduledMessages(createRuntime([]));

    assert.throws(
      () => scheduledMessagesService.cancel(userId, scheduled.id),
      (error: Error & { code?: string }) => error.code === 'SCHEDULED_MESSAGE_NOT_PENDING',
    );
  });
});

test('one user cannot cancel another user\'s scheduled message', async () => {
  await withIsolatedDatabase(async (userId) => {
    const scheduled = scheduledMessagesService.schedule({
      userId,
      sessionId: SESSION_ID,
      content: 'mine',
      scheduledFor: new Date(Date.now() + 3_600_000).toISOString(),
    });

    assert.throws(
      () => scheduledMessagesService.cancel(userId + 1, scheduled.id),
      (error: Error & { code?: string }) => error.code === 'SCHEDULED_MESSAGE_NOT_PENDING',
    );
    assert.equal(scheduledMessagesDb.listForSession(userId, SESSION_ID)[0].status, 'pending');
  });
});

test('scheduling validates its input', async () => {
  await withIsolatedDatabase(async (userId) => {
    const base = { userId, sessionId: SESSION_ID, scheduledFor: new Date(Date.now() + 1000).toISOString() };

    assert.throws(
      () => scheduledMessagesService.schedule({ ...base, content: '   ' }),
      (error: Error & { code?: string }) => error.code === 'CONTENT_REQUIRED',
    );
    assert.throws(
      () => scheduledMessagesService.schedule({ ...base, content: 'hi', scheduledFor: 'not a date' }),
      (error: Error & { code?: string }) => error.code === 'INVALID_SCHEDULE_TIME',
    );
    assert.throws(
      () => scheduledMessagesService.schedule({
        ...base,
        content: 'hi',
        scheduledFor: new Date(Date.now() + 400 * 24 * 3600 * 1000).toISOString(),
      }),
      (error: Error & { code?: string }) => error.code === 'SCHEDULE_TOO_FAR_AHEAD',
    );
    assert.throws(
      () => scheduledMessagesService.schedule({ ...base, sessionId: 'nope', content: 'hi' }),
      (error: Error & { code?: string }) => error.code === 'SESSION_NOT_FOUND',
    );
  });
});


for (const longTask of ['queued', 'scheduled'] as const) {
  test(`a long ${longTask} turn never blocks another session's queued message`, async (t) => {
    await withIsolatedDatabase(async (userId) => {
      t.mock.timers.enable({ apis: ['setInterval'] });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      const calls: string[] = [];
      const runtime = {
        ...(createRuntime([]) as ProviderRuntimeGateway),
        run: async (_provider: unknown, command: string) => { calls.push(command); if (command === 'long task') await gate; },
      } as ProviderRuntimeGateway;
      sessionsDb.createAppSession('other-queue-session', 'claude', '/tmp', 'Other');
      if (longTask === 'queued') sessionDraftsDb.saveDraft(userId, SESSION_ID, { text: '', queuedMessage: { content: 'long task' } });
      else scheduledMessagesService.schedule({ userId, sessionId: SESSION_ID, content: 'long task', scheduledFor: new Date(Date.now() - 60000).toISOString() });
      try {
        initializeScheduledMessageDispatcher(runtime);
        await new Promise<void>((resolve) => setImmediate(resolve));
        sessionDraftsDb.saveDraft(userId, 'other-queue-session', { text: '', queuedMessage: { content: 'send independently' } });
        t.mock.timers.tick(1000);
        await new Promise<void>((resolve) => setImmediate(resolve));
        assert.deepEqual(calls, ['long task', 'send independently']);
      } finally {
        closeScheduledMessageDispatcher(); release();
        await new Promise<void>((resolve) => setImmediate(resolve));
        t.mock.timers.reset();
      }
    });
  });
}

test('manual send claims an idle queue only once, preserving saved options', async () => {
  await withIsolatedDatabase(async (userId) => {
    const message = { content: 'send now', options: { codexFast: true, model: 'queued-model' }, attachments: [] };
    sessionDraftsDb.saveDraft(userId, SESSION_ID, { text: '', queuedMessage: message });
    const calls: RunCall[] = [];
    const runtime = createRuntime(calls);
    await assert.rejects(sendQueuedMessageNow(userId + 1, SESSION_ID, message, runtime), { code: 'QUEUE_CHANGED' });
    assert.deepEqual(await sendQueuedMessageNow(userId, SESSION_ID, message, runtime), { status: 'sending' });
    await assert.rejects(sendQueuedMessageNow(userId, SESSION_ID, message, runtime), { code: 'QUEUE_CHANGED' });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.codexFast, true);
    assert.equal(calls[0].options.model, 'queued-model');
  });
});

test('a runtime without steering retains queued input without aborting the active turn', async () => {
  await withIsolatedDatabase(async (userId) => {
    const message = { content: 'after stopping', attachments: [] };
    sessionDraftsDb.saveDraft(userId, SESSION_ID, { text: '', queuedMessage: message });
    const active = chatRunRegistry.startRun({ appSessionId: SESSION_ID, provider: 'claude', providerSessionId: null, connection: null, userId });
    const calls: RunCall[] = []; const aborts: string[] = [];
    const runtime = createRuntime(calls, 'ok', aborts);
    await assert.rejects(sendQueuedMessageNow(userId, SESSION_ID, message, runtime), { code: 'NO_ACTIVE_TURN' });
    assert.deepEqual(aborts, []);
    assert.equal(await dispatchQueuedMessages(runtime), 0);
    assert.equal(sessionDraftsDb.getDrafts(userId).length, 1);
    active!.writer.sendComplete({ exitCode: 0, aborted: true });
    assert.equal(await dispatchQueuedMessages(runtime), 1);
    assert.equal(calls.length, 1);
  });
});

test('failed admission and unavailable providers retain queued input', async () => {
  await withIsolatedDatabase(async (userId) => {
    const message = { content: 'retain me' };
    sessionDraftsDb.saveDraft(userId, SESSION_ID, { text: '', queuedMessage: message });
    const runtime = { ...(createRuntime([]) as ProviderRuntimeGateway), hasRuntime: () => false };
    await dispatchQueuedMessages(runtime);
    assert.deepEqual(sessionDraftsDb.getDrafts(userId)[0]?.queuedMessage, message);
    await assert.rejects(sendQueuedMessageNow(userId, SESSION_ID, message, runtime), { code: 'QUEUE_UNAVAILABLE' });
    assert.deepEqual(sessionDraftsDb.getDrafts(userId)[0]?.queuedMessage, message);
  });
});

test('queued insertion claims once, preserves attachments and never aborts the native run', async () => {
  await withIsolatedDatabase(async (userId) => {
    const message = { content: 'insert now', attachments: [{ path: '/uploads/a.txt', mimeType: 'text/plain' }] };
    sessionDraftsDb.saveDraft(userId, SESSION_ID, { text: '', queuedMessage: message });
    const active = chatRunRegistry.startRun({ appSessionId: SESSION_ID, provider: 'claude', providerSessionId: null, connection: null, userId })!;
    const aborts: string[] = [];
    const seen: unknown[] = [];
    const runtime = { ...(createRuntime([], 'ok', aborts) as ProviderRuntimeGateway), activeTurnToken: () => 'active-token', steer: async (_provider: string, input: unknown) => { seen.push(input); } };
    assert.deepEqual(await sendQueuedMessageNow(userId, SESSION_ID, message, runtime), { status: 'inserted' });
    assert.equal(seen.length, 1);
    assert.deepEqual((seen[0] as { attachments: unknown[] }).attachments, message.attachments);
    assert.equal(chatRunRegistry.isProcessing(SESSION_ID), true);
    assert.deepEqual(aborts, []);
    await assert.rejects(sendQueuedMessageNow(userId, SESSION_ID, message, runtime), { code: 'QUEUE_CHANGED' });
    active.writer.sendComplete({ exitCode: 0 });
    assert.equal(await dispatchQueuedMessages(runtime), 0);
  });
});

test('an ambiguous steering outcome stays visible but is never automatically resent', async () => {
  await withIsolatedDatabase(async (userId) => {
    const { AppError } = await import('@/shared/index.js');
    const message = { content: 'may have been accepted' };
    sessionDraftsDb.saveDraft(userId, SESSION_ID, { text: '', queuedMessage: message });
    const active = chatRunRegistry.startRun({ appSessionId: SESSION_ID, provider: 'codex', providerSessionId: null, connection: null, userId })!;
    const runtime = { ...(createRuntime([]) as ProviderRuntimeGateway), activeTurnToken: () => 'token', steer: async () => { throw new AppError('Acknowledgement lost', { code: 'STEER_OUTCOME_UNKNOWN', statusCode: 409 }); } };
    await assert.rejects(sendQueuedMessageNow(userId, SESSION_ID, message, runtime), { code: 'STEER_OUTCOME_UNKNOWN' });
    active.writer.sendComplete({ exitCode: 0 });
    assert.equal(await dispatchQueuedMessages(runtime), 0);
    const retained = sessionDraftsDb.getDrafts(userId)[0]?.queuedMessage as { options: Record<string, unknown> };
    assert.equal(retained.options._cloudcliSteerOutcomeUnknown, true);
    await assert.rejects(sendQueuedMessageNow(userId, SESSION_ID, retained, runtime), { code: 'STEER_OUTCOME_UNKNOWN' });
  });
});
