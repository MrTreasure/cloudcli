import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { closeConnection, codexContextDb, initializeDatabase, projectsDb, sessionsDb } from '@/modules/database/index.js';
import { deleteOrArchiveProject } from '@/modules/projects/index.js';
import { codexImageContextService as images } from '@/modules/providers/services/codex-image-context.service.js';
import { sessionsService } from '@/modules/providers/services/sessions.service.js';
import { chatRunRegistry } from '@/modules/websocket/index.js';
import type { CodexContextImage } from '@/shared/types.js';

test('permanent Codex deletion cleans only owned image copies and keeps shared originals recoverable', { concurrency: false }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'codex-image-cleanup-'));
  const previous = process.env.DATABASE_PATH;
  const previousLimit = process.env.CLOUDCLI_CODEX_IMAGE_CACHE_BYTES;
  process.env.DATABASE_PATH = path.join(directory, 'auth.db');
  await initializeDatabase();
  const root = path.join(directory, 'codex-context-images');
  await mkdir(path.join(root, 'catalogs'), { recursive: true });
  const catalogue = (id: string) => path.join(root, 'catalogs', createHash('sha256').update(id).digest('hex') + '.json');
  const image = async (text: string): Promise<CodexContextImage> => {
    const bytes = Buffer.from(text);
    const id = createHash('sha256').update(bytes).digest('hex');
    const file = path.join(root, id + '.png');
    await writeFile(file, bytes);
    return { id, path: file, mime: 'image/png', bytes: bytes.length, encodedBytes: bytes.length, timestamp: new Date().toISOString() };
  };
  const session = async (id: string, entries: CodexContextImage[], project = directory, extra: CodexContextImage[] = []) => {
    const sid = sessionsDb.createSession(id, 'codex', project);
    codexContextDb.save(sid, { ...images.snapshot(sid), images: entries });
    await writeFile(catalogue(sid), JSON.stringify({ images: [...entries, ...extra] }));
    return sid;
  };
  const remove = (id: string) => sessionsService.deleteOrArchiveSessionById(id, { force: true, deletedFromDisk: false });
  try {
    await t.test('soft archive preserves files; permanent deletion removes exclusive and catalogue-only copies', async () => {
      const exclusive = await image('exclusive');
      const shared = await image('shared');
      const catalogueOnly = await image('catalogue-only');
      const outside = await image('outside');
      await rm(outside.path);
      outside.path = path.join(directory, outside.id + '.png');
      await writeFile(outside.path, 'outside must stay');
      const first = await session('first', [exclusive, shared, outside], directory, [catalogueOnly]);
      const second = await session('second', [shared]);
      sessionsDb.updateSessionIsArchived(second, true);
      await sessionsService.deleteOrArchiveSessionById(first);
      assert.ok(existsSync(exclusive.path)); assert.ok(existsSync(catalogue(first)));
      await remove(first);
      assert.equal(existsSync(exclusive.path), false);
      assert.equal(existsSync(catalogueOnly.path), false);
      assert.equal(existsSync(catalogue(first)), false);
      assert.equal(codexContextDb.get(first), null);
      assert.ok(existsSync(shared.path));
      assert.equal(await readFile(outside.path, 'utf8'), 'outside must stay');
      await remove(second);
      assert.equal(existsSync(shared.path), false);
    });
    await t.test('another catalogue protects a shared copy even without a DB image entry', async () => {
      const shared = await image('catalogue-reference');
      const first = await session('catalogue-first', [shared]);
      const second = await session('catalogue-second', [], directory, [shared]);
      await remove(first); assert.ok(existsSync(shared.path));
      await remove(second); assert.equal(existsSync(shared.path), false);
    });
    await t.test('parallel deletions remove a shared copy after the final owner is deleted', async () => {
      const shared = await image('parallel-reference');
      const first = await session('parallel-first', [shared]);
      const second = await session('parallel-second', [shared]);
      await Promise.all([remove(first), remove(second)]);
      assert.equal(existsSync(shared.path), false);
    });
    await t.test('another session starting an archive write keeps its shared copy throughout deletion', async () => {
      const bytes = Buffer.from('archive-in-flight');
      const shared = await image(bytes.toString());
      const first = await session('writer-first', [shared]);
      const second = await session('writer-second', []);
      images.update(second, { recentImages: 3 });
      const originalReferences = codexContextDb.imageIdsOutside.bind(codexContextDb);
      const originalDelete = sessionsDb.deleteSessionById.bind(sessionsDb);
      let writer: Promise<unknown> | undefined;
      const references = t.mock.method(codexContextDb, 'imageIdsOutside', (excluded: ReadonlySet<string>) => {
        const result = originalReferences(excluded);
        writer ??= images.filter(second, { input: [{ type: 'message', role: 'user', content: [
          { type: 'input_image', image_url: 'data:image/png;base64,' + bytes.toString('base64') },
        ] }] }, { policy: images.snapshot(second).policy, initialized: false, knownIds: new Set(), protectedIds: new Set() });
        return result;
      });
      const deletion = t.mock.method(sessionsDb, 'deleteSessionById', (id: string) => {
        if (id === first) assert.ok(existsSync(shared.path), 'an admitted writer must keep its copy');
        return originalDelete(id);
      });
      try { await remove(first); await writer; }
      finally { references.mock.restore(); deletion.mock.restore(); }
      assert.ok(existsSync(shared.path)); await remove(second);
    });
    await t.test('unreadable reference metadata fails safely before removing any image', async () => {
      const original = await image('corrupt-catalogue');
      const sid = await session('corrupt-target', [original]);
      const other = catalogue('corrupt-other');
      await writeFile(other, '{invalid');
      try { await assert.rejects(remove(sid)); assert.ok(existsSync(original.path)); assert.ok(sessionsDb.getSessionById(sid)); }
      finally { await rm(other); }
      await remove(sid);
    });
    await t.test('project deletion handles intra-project sharing while preserving another project', async () => {
      const project = path.join(directory, 'project');
      const exclusive = await image('project-exclusive');
      const shared = await image('cross-project-reference');
      const first = await session('project-first', [exclusive, shared], project);
      const second = await session('project-second', [exclusive], project);
      const third = await session('other-project', [shared], path.join(directory, 'other'));
      await deleteOrArchiveProject(projectsDb.getProjectPath(project)!.project_id, true);
      assert.equal(existsSync(exclusive.path), false); assert.ok(existsSync(shared.path));
      assert.equal(existsSync(catalogue(first)), false); assert.equal(existsSync(catalogue(second)), false);
      assert.equal(codexContextDb.get(first), null); assert.equal(codexContextDb.get(second), null);
      await remove(third); assert.equal(existsSync(shared.path), false);
    });
    await t.test('cleanup failure preserves the session for retry and never reports successful deletion', async () => {
      const blocked = await image('blocked');
      const sid = await session('blocked-session', [blocked]);
      const transcript = path.join(directory, 'must-not-delete.jsonl');
      await writeFile(transcript, 'original');
      sessionsDb.repointSessionToProviderSession(sid, { providerSessionId: sid, jsonlPath: transcript });
      await rm(blocked.path); await mkdir(blocked.path);
      await assert.rejects(sessionsService.deleteOrArchiveSessionById(sid, { force: true, deletedFromDisk: true }));
      assert.ok(sessionsDb.getSessionById(sid)); assert.ok(codexContextDb.get(sid));
      assert.equal(await readFile(transcript, 'utf8'), 'original');
      await rm(blocked.path, { recursive: true }); await writeFile(blocked.path, 'copy');
      await remove(sid);
    });
    await t.test('a running session is rejected before any cache deletion', async () => {
      const original = await image('busy-copy');
      const sid = await session('busy-session', [original]);
      const busy = t.mock.method(chatRunRegistry, 'listRunningRuns', () => [{ sessionId: sid }] as ReturnType<typeof chatRunRegistry.listRunningRuns>);
      try {
        await assert.rejects(remove(sid), (error: unknown) => (error as { code: string }).code === 'SESSION_BUSY');
        assert.ok(existsSync(original.path)); assert.ok(existsSync(catalogue(sid)));
      } finally { busy.mock.restore(); }
      await remove(sid);
    });
    await t.test('deletion releases the in-memory quota counter for subsequent archival writes', async () => {
      const bytes = Buffer.from('new-image');
      process.env.CLOUDCLI_CODEX_IMAGE_CACHE_BYTES = String(bytes.length);
      const admit = async (id: string, payload: Buffer) => {
        const sid = sessionsDb.createSession(id, 'codex', directory);
        images.update(sid, { recentImages: 3 });
        await images.filter(sid, { input: [{ type: 'message', role: 'user', content: [
          { type: 'input_image', image_url: 'data:image/png;base64,' + payload.toString('base64') },
        ] }] }, { policy: images.snapshot(sid).policy, initialized: false, knownIds: new Set(), protectedIds: new Set() });
        return sid;
      };
      const first = await admit('quota-first', bytes);
      await remove(first);
      const second = await admit('quota-second', Buffer.from('nextimage'));
      assert.ok(existsSync(images.snapshot(second).images[0].path));
      await remove(second);
    });
  } finally {
    closeConnection();
    if (previous === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previous;
    if (previousLimit === undefined) delete process.env.CLOUDCLI_CODEX_IMAGE_CACHE_BYTES; else process.env.CLOUDCLI_CODEX_IMAGE_CACHE_BYTES = previousLimit;
    await rm(directory, { recursive: true, force: true });
  }
});
