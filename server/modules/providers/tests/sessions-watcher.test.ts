import assert from 'node:assert/strict';
import { appendFile, chmod, mkdir, mkdtemp, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import chokidar from 'chokidar';
import type { LLMProvider } from '@/shared/types.js';

import { findFilesRecursivelyCreatedAfter } from '@/shared/utils.js';

// Redirect HOME before loading the registry: no test may watch real CLI data.
const fixtureHome = await mkdtemp(path.join(os.tmpdir(), 'session-watcher-'));
const previousHome = process.env.HOME;
const previousProfile = process.env.USERPROFILE;
process.env.HOME = fixtureHome;
process.env.USERPROFILE = fixtureHome;
process.env.DATABASE_PATH = path.join(fixtureHome, 'auth.db');
const { initializeDatabase, closeConnection, sessionsDb } = await import('@/modules/database/index.js');
const { sessionSynchronizerService } = await import('@/modules/providers/services/session-synchronizer.service.js');
const { initializeSessionsWatcher, closeSessionsWatcher } = await import('@/modules/providers/services/sessions-watcher.service.js');

test('incremental discovery includes old transcripts modified since the scan and excludes unchanged files', async () => {
  const root = path.join(fixtureHome, 'scan');
  await mkdir(root, { recursive: true });
  const changed = path.join(root, 'changed.jsonl');
  const unchanged = path.join(root, 'unchanged.jsonl');
  await writeFile(changed, '{}\n');
  await writeFile(unchanged, '{}\n');
  // Birth times remain before this future boundary; only changed's mtime wins.
  const boundary = new Date(Date.now() + 60_000);
  const later = new Date(boundary.getTime() + 60_000);
  await utimes(changed, later, later);
  assert.deepEqual(await findFilesRecursivelyCreatedAfter(root, '.jsonl', boundary), [changed]);
  assert.deepEqual(new Set(await findFilesRecursivelyCreatedAfter(root, '.jsonl', null)), new Set([changed, unchanged]));
});

test('a symlinked Codex root receives real changes and startup repairs old indexed activity without changing titles', { timeout: 25_000 }, async (t) => {
  t.after(async () => {
    await closeSessionsWatcher();
    closeConnection();
    if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
    if (previousProfile === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = previousProfile;
    await rm(fixtureHome, { recursive: true, force: true });
  });
  await initializeDatabase();
  const realRoot = path.join(fixtureHome, 'real-codex-sessions');
  await mkdir(realRoot, { recursive: true });
  await mkdir(path.join(fixtureHome, '.codex'), { recursive: true });
  await symlink(realRoot, path.join(fixtureHome, '.codex/sessions'), 'dir');
  const transcript = path.join(realRoot, 'existing.jsonl');
  await writeFile(transcript, '{}\n');
  // fnOS temp ACLs can expose mode 000 despite allowing access. Give this
  // fixture explicit owner-read bits, matching real Codex transcript files.
  await chmod(transcript, 0o600);
  const old = '2026-01-01T00:00:00.000Z';
  sessionsDb.createSession('existing', 'codex', fixtureHome, 'Keep this title', old, old, transcript);
  t.mock.method(sessionSynchronizerService, 'synchronizeSessions', async () => ({ processedByProvider: { claude: 0, codex: 0, cursor: 0, opencode: 0 }, prunedOrphans: 0, failures: [] }));
  let observed!: () => void;
  const changed = new Promise<void>((resolve) => { observed = resolve; });
  t.mock.method(sessionSynchronizerService, 'synchronizeProviderFile', async (provider: LLMProvider, file: string) => {
    if (provider === 'codex' && file === transcript) observed();
    return { provider, indexed: false, sessionId: null };
  });
  const ready: Promise<void>[] = [];
  const originalWatch = chokidar.watch.bind(chokidar);
  t.mock.method(chokidar, 'watch', (roots: Parameters<typeof chokidar.watch>[0], options: Parameters<typeof chokidar.watch>[1]) => {
    const watcher = originalWatch(roots, options);
    ready.push(new Promise<void>((resolve) => watcher.once('ready', resolve)));
    return watcher;
  });
  await initializeSessionsWatcher();
  await Promise.all(ready);
  const row = sessionsDb.getSessionById('existing')!;
  assert.ok(Date.parse(row.updated_at) > Date.parse(old));
  assert.equal(row.custom_name, 'Keep this title');
  assert.equal(sessionsDb.updateSessionActivity('existing', old), false);
  assert.equal(sessionsDb.getSessionById('existing')?.updated_at, row.updated_at);
  await appendFile(transcript, '{"type":"event_msg"}\n');
  await changed;
});
