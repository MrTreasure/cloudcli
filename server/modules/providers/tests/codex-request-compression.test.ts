import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import { syncBuiltinESMExports } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import zlib from 'node:zlib';

import sharp from 'sharp';

import { initializeDatabase, closeConnection, sessionsDb, codexContextDb } from '@/modules/database/index.js';
import { codexImageContextService as images } from '@/modules/providers/services/codex-image-context.service.js';
import { codexImageProxyService as proxy } from '@/modules/providers/services/codex-image-proxy.service.js';
import { codexRequestCompressionService as codec } from '@/modules/providers/services/codex-request-compression.service.js';
import type { AnyRecord } from '@/shared/types.js';

const signal = () => new AbortController().signal;
const canonical = (value: unknown) => Buffer.from(JSON.stringify(value));
const example = (): AnyRecord => ({
  model: 'mock-model', prompt_cache_key: 'native-test', service_tier: 'priority',
  input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'PROMPT-DO-NOT-LOG '.repeat(1800) }] },
    { type: 'reasoning', encrypted_content: 'OPAQUE-DO-NOT-LOG' },
    { type: 'function_call', call_id: 'call-1', name: 'shell', arguments: '{"command":"echo mock"}' },
    { type: 'function_call_output', call_id: 'call-1', output: 'mock output' }],
  tools: [{ type: 'function', name: 'shell', parameters: { type: 'object' } }],
  reasoning: { effort: 'high' }, metadata: { arbitrary: [0, null, false, 'keep'] },
});

test('Codex final HTTP body encoding, streaming, cancellation and accounting', { concurrency: false, timeout: 30000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cloudcli-wire-'));
  const keys = ['DATABASE_PATH', 'CLOUDCLI_IMAGE_WEBP_CACHE_DIR', 'CLOUDCLI_CODEX_IMAGE_CONTEXT_ENABLED', 'CLOUDCLI_CODEX_REQUEST_COMPRESSION', 'CLOUDCLI_CODEX_REQUEST_GZIP_ORIGINS', 'CLOUDCLI_CODEX_PROXY_COMPRESSED_BODY_BYTES', 'CLOUDCLI_CODEX_PROXY_BODY_BYTES', 'CLOUDCLI_CODEX_PROXY_INCOMING_BODY_BYTES', 'NO_PROXY', 'no_proxy', 'HTTP_PROXY', 'http_proxy'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.DATABASE_PATH = path.join(directory, 'auth.db');
  process.env.CLOUDCLI_IMAGE_WEBP_CACHE_DIR = path.join(directory, 'webp');
  process.env.NO_PROXY = [process.env.NO_PROXY, '127.0.0.1', 'localhost'].filter(Boolean).join(',');
  const logs: unknown[] = [];
  t.mock.method(console, 'info', (...values: unknown[]) => logs.push(values));
  t.mock.method(console, 'warn', (...values: unknown[]) => logs.push(values));
  const calls: Array<{ raw: Buffer; decoded: Buffer; body: AnyRecord; headers: http.IncomingHttpHeaders; url?: string }> = [];
  let finishStream: (() => void) | undefined;
  let streamClosed: Promise<void> = Promise.resolve();
  const upstream = http.createServer(async (req, res) => {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const decoded = req.headers['content-encoding'] === 'zstd' ? zlib.zstdDecompressSync(raw)
      : req.headers['content-encoding'] === 'gzip' ? zlib.gunzipSync(raw) : raw;
    const body = JSON.parse(decoded.toString()); calls.push({ raw, decoded, body, headers: req.headers, url: req.url });
    const status = Number(body.mockStatus ?? 200);
    if (status !== 200) { res.writeHead(status, { 'retry-after': '3' }).end('mock rejection'); return; }
    if (body.mockNetworkError) { req.socket.destroy(); return; }
    if (req.url?.split('?')[0].endsWith('/compact')) { res.setHeader('content-type', 'application/json'); res.end('{"output":[],"usage":{"input_tokens":12}}'); return; }
    res.setHeader('content-type', 'text/event-stream');
    res.write('data: {"type":"response.output_item.added","item":{"type":"function_call","name":"shell"}}\n\n');
    if (body.mockStream) {
      streamClosed = new Promise<void>(resolve => res.once('close', resolve));
      await new Promise<void>(resolve => { finishStream = resolve; res.once('close', resolve); });
    }
    res.end('data: [DONE]\n\n');
  });
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(upstream.address() as { port: number }).port}`;
  await initializeDatabase();
  const open = async (mode: string, filterImages = false, confirmed = true, upstreamOrigin = origin) => {
    process.env.CLOUDCLI_CODEX_REQUEST_COMPRESSION = mode;
    process.env.CLOUDCLI_CODEX_IMAGE_CONTEXT_ENABLED = String(filterImages);
    process.env.CLOUDCLI_CODEX_REQUEST_GZIP_ORIGINS = confirmed ? origin : '';
    const sessionId = randomUUID(); sessionsDb.createSession(sessionId, 'codex', directory);
    const route = await proxy.open({ sessionId, cwd: directory, request: async () => ({ config: {
      model_provider: 'mock', model_providers: { mock: { base_url: upstreamOrigin + '/v1', wire_api: 'responses' } },
    } }) });
    assert.ok(route); route.bindThread('native-test');
    return { sessionId, route, url: String(route.config['model_providers.mock.base_url']) };
  };
  const send = (url: string, bytes: Buffer, encoding?: string | string[], endpoint = '/responses', chunked = false) => new Promise<{ status: number; headers: http.IncomingHttpHeaders; bytes: Buffer }>((resolve, reject) => {
    const headers: http.OutgoingHttpHeaders = {
      'content-type': 'application/json', 'thread-id': 'native-test', 'session-id': 'native-test',
      authorization: 'Bearer MOCK-AUTH-DO-NOT-LOG', originator: 'mock', 'x-codex-probe': 'kept', accept: 'text/event-stream',
      ...(chunked ? {} : { 'content-length': bytes.length }),
    };
    // Negative protocol cases intentionally use arrays for repeated raw headers.
    if (encoding) (headers as AnyRecord)['content-encoding'] = encoding;
    const request = http.request(url + endpoint, { method: 'POST', headers }, res => {
      const chunks: Buffer[] = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, bytes: Buffer.concat(chunks) }));
    });
    request.on('error', reject); if (chunked) request.write(bytes); request.end(chunked ? undefined : bytes);
  });
  try {
    await t.test('identity, zstd and confirmed gzip preserve every JSON byte and required header', async () => {
      for (const mode of ['identity', 'zstd', 'gzip']) {
        const { route, url, sessionId } = await open(mode);
        const input = canonical(example()); const response = await send(url, input, undefined, '/responses', true);
        assert.equal(response.status, 200); const call = calls.at(-1)!;
        assert.deepEqual(call.decoded, input); assert.equal(call.url, '/v1/responses');
        assert.equal(call.headers['content-encoding'] ?? 'identity', mode);
        assert.equal(Number(call.headers['content-length']), call.raw.length); assert.equal(call.headers['transfer-encoding'], undefined);
        assert.equal(call.headers.authorization, 'Bearer MOCK-AUTH-DO-NOT-LOG');
        assert.equal(call.headers['session-id'], 'native-test'); assert.equal(call.headers.originator, 'mock'); assert.equal(call.headers['x-codex-probe'], 'kept');
        const stats = images.snapshot(sessionId).metrics.transport!;
        assert.equal(stats.requests, 1); assert.equal(stats.totalWireBytes, call.raw.length);
        assert.equal(call.headers['x-request-id'], stats.lastRequestId);
        assert.equal(stats.maxWireBytes, call.raw.length); assert.equal(stats.totalJsonBytes, input.length); assert.equal(stats.lastStatus, 200);
        route.close();
      }
    });
    await t.test('preencoded inputs are decoded then encoded once, including compact JSON responses', async () => {
      for (const [incoming, outgoing] of [['gzip', 'zstd'], ['zstd', 'gzip']]) {
        const { route, url } = await open(outgoing);
        const input = canonical(example()); const bytes = incoming === 'gzip' ? zlib.gzipSync(input) : zlib.zstdCompressSync(input);
        const response = await send(url, bytes, incoming, '/responses/compact');
        assert.equal(response.status, 200); assert.deepEqual(calls.at(-1)!.decoded, input);
        assert.equal(calls.at(-1)!.headers['content-encoding'], outgoing);
        assert.equal(calls.at(-1)!.url, '/v1/responses/compact'); assert.deepEqual(JSON.parse(response.bytes.toString()).output, []); route.close();
      }
    });
    await t.test('tiny and non-beneficial bodies choose identity before sending', async () => {
      const { route, url } = await open('zstd'); const tiny = canonical({ prompt_cache_key: 'native-test', input: [] });
      await send(url, zlib.gzipSync(tiny), 'gzip'); assert.deepEqual(calls.at(-1)!.raw, tiny); assert.equal(calls.at(-1)!.headers['content-encoding'], undefined);
      const random = randomBytes(8192); const result = await codec.encode(random, '', codec.settings(), origin, signal());
      assert.equal(result.encoding, 'identity'); assert.deepEqual(result.bytes, random); route.close();
      // Opt-in limits must not reduce the legacy preserve mode's native limit.
      const legacy = canonical({ random: randomBytes(64000).toString('base64') });
      const preserved = await codec.encode(legacy, 'gzip', { ...codec.settings(), mode: 'preserve', maxCompressedBytes: 4096 }, origin, signal());
      assert.equal(preserved.encoding, 'gzip'); assert.ok(preserved.bytes.length > 4096);
      assert.deepEqual(zlib.gunzipSync(preserved.bytes), legacy);
    });
    await t.test('only final filtered WebP JSON is compressed and original images are archived', async () => {
      const { route, url, sessionId } = await open('zstd', true);
      const original = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#619aca' } }).png({ compressionLevel: 0 }).toBuffer();
      const body = example(); body.input[0].content.push({ type: 'input_image', image_url: 'data:image/png;base64,' + original.toString('base64') } as never);
      const expected = structuredClone(body);
      await images.filter(sessionId, expected, { policy: images.snapshot(sessionId).policy, initialized: false, knownIds: new Set(), protectedIds: new Set() });
      assert.match(expected.input[0].content[1].image_url, /^data:image\/webp/);
      const response = await send(url, canonical(body)); assert.equal(response.status, 200);
      assert.deepEqual(calls.at(-1)!.decoded, canonical(expected)); assert.equal(calls.at(-1)!.body.input[1].encrypted_content, 'OPAQUE-DO-NOT-LOG');
      assert.deepEqual(await readFile(images.snapshot(sessionId).images[0].path), original); route.close();
    });
    await t.test('oversized native history is filtered before the final JSON limit, including encoded intake', async () => {
      process.env.CLOUDCLI_CODEX_PROXY_BODY_BYTES = String(1048576);
      process.env.CLOUDCLI_CODEX_PROXY_INCOMING_BODY_BYTES = String(4 * 1048576);
      const { route, url, sessionId } = await open('zstd', true);
      try {
        images.update(sessionId, { recentImages: 0 });
        // Reopen to capture the updated per-run policy, as the runtime does.
        route.close();
        const reopened = await proxy.open({ sessionId, cwd: directory, request: async () => ({ config: {
          model_provider: 'mock', model_providers: { mock: { base_url: origin + '/v1', wire_api: 'responses' } },
        } }) });
        assert.ok(reopened); reopened.bindThread('native-test');
        try {
          const original = await sharp({ create: { width: 1024, height: 512, channels: 3, background: '#619aca' } }).png({ compressionLevel: 0 }).toBuffer();
          const body = example();
          body.input.unshift({ type: 'message', role: 'user', content: [{ type: 'input_image', image_url: 'data:image/png;base64,' + original.toString('base64') }] });
          const input = canonical(body); assert.ok(input.length > 1048576);
          for (const encoding of [undefined, 'zstd']) {
            const bytes = encoding ? zlib.zstdCompressSync(input) : input;
            const response = await send(url, bytes, encoding);
            assert.equal(response.status, 200);
            const call = calls.at(-1)!;
            assert.match(call.body.input[0].content[0].text, /Archived image/);
            assert.ok(call.decoded.length < 1048576);
            assert.equal(call.headers['content-encoding'], 'zstd');
            assert.ok(call.raw.length < call.decoded.length);
            assert.equal(images.snapshot(sessionId).metrics.jsonBytesBefore, input.length);
          }
          assert.deepEqual(await readFile(images.snapshot(sessionId).images[0].path), original);
          const before = calls.length;
          // Filtering cannot excuse excessive non-image content.
          const excessive = canonical({ ...example(), padding: 'x'.repeat(2 * 1048576) });
          assert.equal((await send(url, excessive)).status, 413);
          assert.equal(calls.length, before);
          process.env.CLOUDCLI_CODEX_PROXY_INCOMING_BODY_BYTES = String(1048576);
          assert.equal((await send(url, excessive)).status, 413);
          assert.equal((await send(url, zlib.zstdCompressSync(excessive), 'zstd')).status, 413);
          assert.equal(calls.length, before);
        } finally { reopened.close(); }
      } finally {
        route.close(); delete process.env.CLOUDCLI_CODEX_PROXY_BODY_BYTES; delete process.env.CLOUDCLI_CODEX_PROXY_INCOMING_BODY_BYTES;
      }
    });
    await t.test('the network proxy receives compressed bytes for parent, child and inactive leases', async () => {
      const captured: Array<{ bytes: Buffer; encoding: string | string[] | undefined; url?: string }> = [];
      const gateway = http.createServer(async (req, res) => {
        const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk);
        captured.push({ bytes: Buffer.concat(chunks), encoding: req.headers['content-encoding'], url: req.url });
        res.end('{"ok":true}');
      });
      await new Promise<void>(resolve => gateway.listen(0, '127.0.0.1', resolve));
      const proxyKeys = ['HTTP_PROXY', 'http_proxy', 'NO_PROXY', 'no_proxy'];
      const saved = Object.fromEntries(proxyKeys.map(key => [key, process.env[key]]));
      process.env.HTTP_PROXY = process.env.http_proxy = `http://127.0.0.1:${(gateway.address() as { port: number }).port}`;
      process.env.NO_PROXY = process.env.no_proxy = '';
      const { route, url, sessionId } = await open('zstd', false, true, 'http://wire-target.invalid');
      try {
        for (const thread of ['native-test', 'child', 'inactive']) {
          if (thread === 'inactive') route.close();
          const body = canonical({ ...example(), prompt_cache_key: thread });
          const before = images.snapshot(sessionId).metrics.transport?.requests ?? 0;
          if (thread === 'native-test') assert.equal((await send(url, body)).status, 200);
          else {
            const response = await fetch(url + '/responses', { method: 'POST', headers: { 'thread-id': thread }, body });
            assert.equal(response.status, 200); await response.text();
          }
          const call = captured.at(-1)!;
          assert.equal(call.url, 'http://wire-target.invalid/v1/responses');
          assert.equal(call.encoding, 'zstd'); assert.deepEqual(zlib.zstdDecompressSync(call.bytes), body);
          assert.ok(call.bytes.length < body.length / 10);
          assert.equal(images.snapshot(sessionId).metrics.transport?.requests, before + (thread === 'native-test' ? 1 : 0));
        }
      } finally {
        route.close(); gateway.closeAllConnections(); await new Promise<void>(resolve => gateway.close(() => resolve()));
        for (const key of proxyKeys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
      }
    });
    await t.test('errors, invalid encodings and limits never trigger an encoding replay', async () => {
      const { route, url } = await open('zstd');
      for (const status of [400, 413, 415, 503]) {
        const before = calls.length; const response = await send(url, canonical({ ...example(), mockStatus: status }));
        assert.equal(response.status, status); assert.equal(response.headers['retry-after'], '3'); assert.equal(calls.length, before + 1);
      }
      let before = calls.length;
      for (const [bytes, encoding, status] of [[Buffer.from('invalid gzip'), 'gzip', 400], [canonical(example()), 'gzip, zstd', 415], [canonical(example()), ['gzip', 'gzip'], 415]] as const) {
        const response = await send(url, bytes, encoding as unknown as string | string[]); assert.equal(response.status, status);
      }
      assert.equal(calls.length, before);
      process.env.CLOUDCLI_CODEX_PROXY_COMPRESSED_BODY_BYTES = '4096';
      const limited = await open('zstd'); const response = await send(limited.url, canonical({ ...example(), random: randomBytes(64000).toString('base64') }));
      assert.equal(response.status, 413); assert.equal(calls.length, before); limited.route.close(); delete process.env.CLOUDCLI_CODEX_PROXY_COMPRESSED_BODY_BYTES;
      await assert.rejects(codec.decode(zlib.gzipSync(Buffer.alloc(20000)), 'gzip', 1000, signal()), error => (error as AnyRecord).statusCode === 413);
      before = calls.length; assert.equal((await send(url, canonical({ ...example(), mockNetworkError: true }))).status, 502); assert.equal(calls.length, before + 1); route.close();
    });
    await t.test('gzip requires an explicit confirmed origin and missing zstd uses only preconfirmed gzip', async () => {
      const { route, url } = await open('gzip', false, false); const before = calls.length;
      assert.equal((await send(url, canonical(example()))).status, 415); assert.equal(calls.length, before); route.close();
      const original = zlib.zstdCompress;
      try {
        (zlib as AnyRecord).zstdCompress = undefined; syncBuiltinESMExports();
        const settings = { ...codec.settings(), mode: 'zstd' as const, gzipOrigins: [origin] };
        const result = await codec.encode(canonical(example()), '', settings, origin, signal()); assert.equal(result.encoding, 'gzip'); assert.deepEqual(zlib.gunzipSync(result.bytes), canonical(example()));
        await assert.rejects(codec.encode(canonical(example()), '', { ...settings, gzipOrigins: [] }, origin, signal()), error => (error as AnyRecord).statusCode === 415);
      } finally { zlib.zstdCompress = original; syncBuiltinESMExports(); }
    });
    await t.test('codec failure is reported before any upstream request, without identity fallback', async () => {
      const { route, url } = await open('zstd'); const before = calls.length; const original = zlib.zstdCompress;
      try {
        (zlib as AnyRecord).zstdCompress = () => { throw new Error('simulated codec failure'); }; syncBuiltinESMExports();
        assert.equal((await send(url, canonical(example()))).status, 500); assert.equal(calls.length, before);
      } finally { zlib.zstdCompress = original; syncBuiltinESMExports(); route.close(); }
    });
    await t.test('SSE reaches the caller before completion and cancellation closes the upstream', async () => {
      const { route, url, sessionId } = await open('zstd'); const controller = new AbortController();
      const response = await fetch(url + '/responses', { method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json', 'thread-id': 'native-test' }, body: canonical({ ...example(), mockStream: true }) });
      const reader = response.body!.getReader(); const first = await reader.read(); assert.match(Buffer.from(first.value!).toString(), /function_call/);
      controller.abort(); await assert.rejects(reader.read());
      await Promise.race([streamClosed, new Promise((_, reject) => setTimeout(() => reject(new Error('Upstream not cancelled')), 1500))]); finishStream?.(); route.close();
      assert.equal(images.snapshot(sessionId).metrics.transport?.lastStatus, 'aborted');
      const codecAbort = new AbortController(); const encoded = codec.encode(Buffer.alloc(16 * 1048576, 65), '', codec.settings(), origin, codecAbort.signal); codecAbort.abort();
      await assert.rejects(encoded, error => (error as Error).name === 'AbortError');
    });
    await t.test('concurrent sessions isolate counters and child threads retain their exact content', async () => {
      const opened = await Promise.all([open('zstd'), open('gzip'), open('identity')]);
      await Promise.all(opened.map((entry, index) => send(entry.url, canonical({ ...example(), index }))));
      for (const entry of opened) assert.equal(images.snapshot(entry.sessionId).metrics.transport?.requests, 1);
      const entry = opened[0]; const child = canonical({ ...example(), prompt_cache_key: 'child' });
      const before = images.snapshot(entry.sessionId).metrics.transport!.requests;
      await new Promise<void>((resolve, reject) => { const req = http.request(entry.url + '/responses', { method: 'POST', headers: { 'content-type': 'application/json', 'thread-id': 'child' } }, res => { res.resume(); res.on('end', resolve); }); req.on('error', reject); req.end(child); });
      assert.deepEqual(calls.at(-1)!.decoded, child); assert.equal(calls.at(-1)!.headers['content-encoding'], 'zstd');
      assert.equal(images.snapshot(entry.sessionId).metrics.transport!.requests, before);
      // The new cohort must not invent historic maxima from old counters.
      const state = images.snapshot(entry.sessionId); state.metrics.requests = 100; state.metrics.uploadedBytes = 100000000; delete state.metrics.transport; codexContextDb.save(entry.sessionId, state);
      await send(entry.url, canonical(example())); assert.equal(images.snapshot(entry.sessionId).metrics.transport!.requests, 1);
      opened.forEach(value => value.route.close());
    });
    assert.equal(JSON.stringify(logs).includes('PROMPT-DO-NOT-LOG'), false);
    assert.equal(JSON.stringify(logs).includes('OPAQUE-DO-NOT-LOG'), false);
    assert.equal(JSON.stringify(logs).includes('MOCK-AUTH-DO-NOT-LOG'), false);
  } finally {
    finishStream?.(); upstream.closeAllConnections(); await new Promise<void>(resolve => upstream.close(() => resolve()));
    closeConnection(); for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
    await rm(directory, { recursive: true, force: true });
  }
});
