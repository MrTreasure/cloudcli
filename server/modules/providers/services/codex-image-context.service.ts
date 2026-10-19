import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, stat, rename, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

import { codexContextDb, sessionsDb, getConnection, getDatabasePath } from '@/modules/database/index.js';
import type { AnyRecord, CodexContextState, CodexImageContextPolicy, CodexImageFilterLease, ProviderRuntimeContext } from '@/shared/types.js';
import { AppError } from '@/shared/utils.js';

const limit = (value: unknown, fallback: number, maximum: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : fallback;
};
const jsonBytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
const emptyState = (): CodexContextState => ({
  policy: { recentImages: limit(process.env.CLOUDCLI_CODEX_HISTORY_IMAGES, 3, 100),
    imageBytes: limit(process.env.CLOUDCLI_CODEX_HISTORY_IMAGE_BYTES, 1048576, 64 * 1048576), pinnedImageIds: [] },
  segments: [], images: [], activeImageIds: [],
  metrics: { historicalImageCount: 0, historicalImageBytes: 0, retainedImageCount: 0, retainedImageBytes: 0,
    currentImageCount: 0, currentImageBytes: 0, budgetExceeded: false, compactions: 0, switches: 0,
    requests: 0, requestBytesBefore: 0, requestBytesAfter: 0, jsonBytesBefore: 0, jsonBytesAfter: 0,
    savedBytes: 0, uploadedBytes: 0, prunedImageCount: 0 },
});
function sessionState(sessionId: string) {
  const session = sessionsDb.getSessionById(sessionId);
  if (!session || session.provider !== 'codex') throw new AppError('A Codex session is required.', { code: 'CODEX_CONTEXT_SESSION', statusCode: 404 });
  return { session, state: codexContextDb.get(sessionId) ?? emptyState() };
}
function imageRoot() { return path.join(path.dirname(getDatabasePath()), 'codex-context-images'); }

// Visit typed image content only. Ordinary text, encrypted state and unknown/file-ID
// representations are passed through unchanged, never interpreted as binary data.
function visitImages(value: unknown, visit: (item: AnyRecord, replace: (value: AnyRecord) => void) => void): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'encrypted_content' || !child || typeof child !== 'object') continue;
    if (!Array.isArray(child) && (child as AnyRecord).type === 'input_image') {
      visit(child, replacement => { (value as AnyRecord)[key] = replacement; });
    } else visitImages(child, visit);
  }
}
const cacheUsage = new Map<string, { bytes: number; initialized: boolean; tail: Promise<void> }>();
async function saveImage(file: string, bytes: Buffer) {
  const root = imageRoot();
  let usage = cacheUsage.get(root);
  if (!usage) { usage = { bytes: 0, initialized: false, tail: Promise.resolve() }; cacheUsage.set(root,usage); }
  const counter = usage;
  const write = counter.tail.then(async () => {
    await mkdir(root, { recursive: true, mode: 0o700 });
    if (!counter.initialized) {
      for (const entry of await readdir(root, { withFileTypes: true })) {
        if (entry.isFile()) counter.bytes += (await stat(path.join(root,entry.name))).size;
      }
      counter.initialized = true;
    }
    try { await stat(file); return; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const maximum = limit(process.env.CLOUDCLI_CODEX_IMAGE_CACHE_BYTES, 512 * 1048576, 1024 * 1024 * 1048576);
    if (counter.bytes + bytes.length > maximum) throw new AppError('Local image archive is full. Increase CLOUDCLI_CODEX_IMAGE_CACHE_BYTES; original chat images were not removed.', { code: 'CODEX_IMAGE_CACHE_FULL', statusCode: 507 });
    const temporary = file + '.' + randomUUID() + '.tmp';
    try {
      await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 });
      await rename(temporary,file);
      counter.bytes += bytes.length;
    } finally { await unlink(temporary).catch(() => {}); }
  });
  counter.tail = write.catch(() => {});
  return write;
}
async function archive(item: AnyRecord, state: CodexContextState) {
  const match = typeof item.image_url === 'string' ? /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(item.image_url) : null;
  if (!match) return null;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0) return null;
  const id = createHash('sha256').update(bytes).digest('hex');
  let image = state.images.find(image => image.id === id);
  if (!image) {
    const extension = ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' } as Record<string,string>)[match[1]] ?? '.image';
    const file = path.join(imageRoot(), id + extension);
    await saveImage(file, bytes);
    image = { id, path: file, mime: match[1], bytes: bytes.length, encodedBytes: jsonBytes(item), timestamp: new Date().toISOString() };
    state.images.push(image);
  } else await saveImage(image.path,bytes);
  return image;
}
async function catalogue(sessionId: string, state: CodexContextState) {
  const directory = path.join(imageRoot(), 'catalogs');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, createHash('sha256').update(sessionId).digest('hex') + '.json');
  const temporary = file + '.' + randomUUID() + '.tmp';
  await writeFile(temporary, JSON.stringify({ images: state.images.map((image, index) => ({ number: index + 1, ...image })) }), { flag: 'wx', mode: 0o600 });
  await rename(temporary, file);
  return file;
}

async function countCompactions(file: string | null) {
  if (!file) return 0;
  let count = 0;
  const stream = createReadStream(file, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (!line.includes('"compacted"')) continue;
      try { if (JSON.parse(line).type === 'compacted') count += 1; } catch { /* incomplete live tail */ }
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  finally { lines.close(); stream.destroy(); }
  return count;
}

/** Providers uses this service for local HTTP image filtering, authenticated settings and explicit clear. */
export const codexImageContextService = {
  snapshot(sessionId: string) { return sessionState(sessionId).state; },
  async describe(sessionId: string) {
    const { session, state } = sessionState(sessionId);
    // The popup may be opened before the first intercepted request. Populate its
    // attachment references from the original rollout, without changing that file.
    if (session.jsonl_path) {
      const stream = createReadStream(session.jsonl_path, { encoding: 'utf8' });
      const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
      let compactions = 0;
      try {
        for await (const line of lines) {
          let row: AnyRecord; try { row = JSON.parse(line); } catch { continue; }
          if (row.type === 'compacted') compactions += 1;
          if (row.type !== 'response_item' && row.type !== 'compacted') continue;
          const items: AnyRecord[] = [];
          visitImages(row, item => items.push(item));
          for (const item of items) await archive(item, state);
        }
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      finally { lines.close(); stream.destroy(); }
      const latest = sessionState(sessionId).state;
      state.policy = latest.policy;
      state.segments = latest.segments;
      state.images = [...new Map([...latest.images, ...state.images].map(image => [image.id, image])).values()];
      state.metrics = { ...latest.metrics, compactions: latest.segments.reduce((sum, segment) => sum + (segment.compactions ?? 0), 0) + compactions };
      codexContextDb.save(sessionId, state);
    }
    return state;
  },
  update(sessionId: string, policy: Partial<CodexImageContextPolicy>) {
    const { state } = sessionState(sessionId);
    for (const [key, maximum] of [['recentImages', 100], ['imageBytes', 64 * 1048576]] as const) {
      if (policy[key] !== undefined) {
        if (!Number.isInteger(policy[key]) || policy[key]! < 0 || policy[key]! > maximum) throw new AppError('Invalid image context limit.', { code: 'CODEX_CONTEXT_POLICY', statusCode: 400 });
        state.policy[key] = policy[key]!;
      }
    }
    if (policy.pinnedImageIds !== undefined) {
      if (!Array.isArray(policy.pinnedImageIds) || policy.pinnedImageIds.length > 100 || policy.pinnedImageIds.some(id => typeof id !== 'string' || !state.images.some(image => image.id === id))) throw new AppError('Unknown historical image reference.', { code: 'CODEX_CONTEXT_IMAGE', statusCode: 400 });
      state.policy.pinnedImageIds = [...new Set(policy.pinnedImageIds)];
    }
    codexContextDb.save(sessionId, state);
    return state;
  },
  async filter(sessionId: string, body: AnyRecord, lease: CodexImageFilterLease) {
    if (!Array.isArray(body.input)) return { prunedImageCount: 0 };
    const { state } = sessionState(sessionId);
    const input = body.input as AnyRecord[];
    const entries: Array<{ image: NonNullable<Awaited<ReturnType<typeof archive>>>; index: number; bytes: number; replace: (value: AnyRecord) => void; required: boolean; currentUser: boolean }> = [];
    let newestUser = -1;
    input.forEach((item, index) => { if (item.type === 'message' && item.role === 'user') newestUser = index; });
    let lastResponse = -1;
    input.forEach((item, index) => { if (item.role === 'assistant' || ['function_call', 'custom_tool_call', 'reasoning', 'compaction', 'context_compaction'].includes(item.type)) lastResponse = index; });
    for (let index = 0; index < input.length; index += 1) {
      const images: Array<{ item: AnyRecord; replace: (value: AnyRecord) => void }> = [];
      visitImages({ item: input[index] }, (item, replace) => images.push({ item, replace }));
      for (const { item, replace } of images) {
        const image = await archive(item, state);
        if (!image) continue; // Unsupported representations are kept intact.
        const fresh = lease.initialized && !lease.knownIds.has(image.id);
        const currentUserImage = newestUser >= 0 && index === newestUser;
        const required = newestUser < 0 || currentUserImage || index >= lastResponse || fresh || lease.protectedIds.has(image.id);
        // User/steer images remain protected for the admitted turn. Tool images
        // may expire after a later model response has consumed them.
        if (currentUserImage) lease.protectedIds.add(image.id);
        entries.push({ image, index, bytes: jsonBytes(item), replace, required, currentUser: currentUserImage });
      }
    }
    entries.forEach(entry => lease.knownIds.add(entry.image.id));
    lease.initialized = true;
    const pins = new Set(lease.policy.pinnedImageIds);
    const requiredIds = new Set(entries.filter(entry => entry.required).map(entry => entry.image.id));
    const historicalEntries = entries.filter(entry => !entry.required);
    const historical = historicalEntries.filter(entry => !requiredIds.has(entry.image.id));
    const keep = new Set<string>(pins);
    let retainedBytes = state.images.filter(image => pins.has(image.id)).reduce((sum,image) => sum + image.encodedBytes, 0);
    let count = 0;
    for (const entry of [...historical].reverse()) {
      const { image } = entry;
      if (keep.has(image.id)) continue;
      // At least the newest historical image is usable even when oversized.
      if (count < lease.policy.recentImages && (count === 0 || retainedBytes + entry.bytes <= lease.policy.imageBytes)) {
        keep.add(image.id); retainedBytes += entry.bytes; count += 1;
      }
    }
    let prunedImageCount = 0;
    const seen = new Set<string>();
    for (const entry of [...entries].reverse()) {
      const id = entry.image.id;
      const retain = entry.currentUser || (entry.required ? !seen.has(id) : !requiredIds.has(id) && keep.has(id) && !seen.has(id));
      if (retain) seen.add(id);
      else {
        entry.replace({ type: 'input_text', text: `[Archived image ${id.slice(0,12)}; original: ${entry.image.path}. Use view_image on explicit need.]` });
        prunedImageCount += 1;
      }
    }
    const user = input[newestUser];
    if (user && Array.isArray(user.content) && state.images.length > 0) {
      const file = await catalogue(sessionId, state);
      user.content.push({ type: 'input_text', text: `[CloudCLI image archive: ${file}. Contains this conversation's image numbers, hashes and local paths. Read the catalogue and use view_image only when an earlier image is needed.]` });
      const present = new Set(entries.map(entry => entry.image.id));
      for (const image of state.images.filter(image => pins.has(image.id) && !present.has(image.id))) {
        user.content.push({ type: 'input_text', text: `Explicit comparison image ${image.id.slice(0,12)}` }, { type: 'input_image', image_url: `data:${image.mime};base64,${(await readFile(image.path)).toString('base64')}` });
      }
    }
    const latest = sessionState(sessionId).state;
    latest.images = [...new Map([...latest.images, ...state.images].map(image => [image.id,image])).values()];
    latest.activeImageIds = [...seen];
    const required = entries.filter(entry => entry.required);
    Object.assign(latest.metrics, { historicalImageCount: historicalEntries.length,
      historicalImageBytes: historicalEntries.reduce((sum,entry) => sum + entry.bytes,0),
      retainedImageCount: keep.size, retainedImageBytes: retainedBytes,
      currentImageCount: required.length, currentImageBytes: required.reduce((sum,entry) => sum + entry.bytes,0),
      budgetExceeded: retainedBytes > lease.policy.imageBytes || required.reduce((sum,entry) => sum + entry.bytes,0) > lease.policy.imageBytes,
      prunedImageCount });
    codexContextDb.save(sessionId, latest);
    return { prunedImageCount };
  },
  recordHttp(sessionId: string, measurement: { requestBytesBefore: number; requestBytesAfter: number; jsonBytesBefore: number; jsonBytesAfter: number }) {
    const { state } = sessionState(sessionId);
    Object.assign(state.metrics, measurement, { requests: state.metrics.requests + 1,
      savedBytes: state.metrics.savedBytes + measurement.requestBytesBefore - measurement.requestBytesAfter,
      uploadedBytes: state.metrics.uploadedBytes + measurement.requestBytesAfter });
    codexContextDb.save(sessionId, state);
    console.info('[Codex image proxy]', { sessionId, ...state.metrics, measurement: 'measured-http-body-to-configured-upstream; downstream-CPA-traffic-unknown' });
  },
  async clear(input: Parameters<NonNullable<ProviderRuntimeContext['clearImageContext']>>[0]) {
    const { sessionId, threadId, threadParams, request, checkAbort } = input;
    const { session } = sessionState(sessionId);
    const compactions = await countCompactions(session.jsonl_path);
    checkAbort();
    const next = await request('thread/start', threadParams) as AnyRecord;
    const nextId = next?.thread?.id;
    const nextPath = next?.thread?.path;
    if (typeof nextId !== 'string' || typeof nextPath !== 'string') throw new AppError('Codex did not provide a durable empty thread.', { code: 'CODEX_CONTEXT_THREAD', statusCode: 502 });
    try {
      checkAbort();
      await request('thread/inject_items', { threadId: nextId, items: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: '[CloudCLI context cleared] The user cleared model working context. Start a new task.' }] }] });
      await stat(nextPath);
      checkAbort();
      getConnection().transaction(() => {
        const latest = sessionState(sessionId);
        if (latest.session.provider_session_id !== threadId) throw new AppError('Session changed during context clear.', { code: 'CODEX_CONTEXT_RACE', statusCode: 409 });
        const updated = latest.state;
        if (session.jsonl_path) updated.segments.push({ threadId, path: session.jsonl_path, reason: 'clear', compactions });
        updated.policy.pinnedImageIds = [];
        updated.activeImageIds = [];
        updated.metrics.switches += 1;
        updated.metrics.currentImageCount = 0; updated.metrics.retainedImageCount = 0;
        updated.metrics.currentImageBytes = 0; updated.metrics.retainedImageBytes = 0;
        updated.metrics.budgetExceeded = false;
        sessionsDb.markProviderSessionSuperseded({ providerSessionId: threadId, provider: 'codex', sessionId, jsonlPath: session.jsonl_path });
        sessionsDb.repointSessionToProviderSession(sessionId, { providerSessionId: nextId, jsonlPath: nextPath });
        codexContextDb.save(sessionId, updated);
      })();
    } catch (error) {
      sessionsDb.markProviderSessionSuperseded({ providerSessionId: nextId, provider: 'codex', sessionId, jsonlPath: nextPath });
      if (nextId !== sessionId) sessionsDb.deleteSessionById(nextId);
      throw error;
    }
    return { threadId: nextId, threadResult: next };
  },
};
