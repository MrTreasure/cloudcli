import { randomBytes } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import * as zlib from 'node:zlib';

import { ProxyAgent } from 'proxy-agent';

import { codexImageContextService } from '@/modules/providers/services/codex-image-context.service.js';
import type { AnyRecord, CodexImageFilterLease, ProviderRuntimeContext } from '@/shared/types.js';
import { AppError } from '@/shared/utils.js';

type Route = { sessionId: string; upstream: URL; threadId: string | null; lease: CodexImageFilterLease | null };
const routes = new Map<string, Route>();
const sessionRoutes = new Map<string, { token: string; route: Route }>();
const agent = new ProxyAgent();
let listening: Promise<string> | null = null;

function bodyLimit() {
  const parsed = Number(process.env.CLOUDCLI_CODEX_PROXY_BODY_BYTES);
  return Number.isSafeInteger(parsed) && parsed >= 1048576 && parsed <= 256 * 1048576 ? parsed : 64 * 1048576;
}
async function decode(bytes: Buffer, encoding: string): Promise<Buffer> {
  const options = { maxOutputLength: bodyLimit() };
  switch (encoding) {
    case '': case 'identity': return bytes;
    case 'gzip': return promisify(zlib.gunzip)(bytes, options);
    case 'deflate': return promisify(zlib.inflate)(bytes, options);
    case 'br': return promisify(zlib.brotliDecompress)(bytes, options);
    case 'zstd': {
      const decoder = (zlib as AnyRecord).zstdDecompress;
      if (!decoder) throw new AppError('This Node version cannot decode Codex zstd requests. Upgrade Node to 22.15+.', { code: 'CODEX_PROXY_ENCODING', statusCode: 415 });
      return promisify(decoder)(bytes, options) as Promise<Buffer>;
    }
    default: throw new AppError('Unsupported Codex HTTP request encoding.', { code: 'CODEX_PROXY_ENCODING', statusCode: 415 });
  }
}
async function encode(bytes: Buffer, encoding: string): Promise<Buffer> {
  switch (encoding) {
    case '': case 'identity': return bytes;
    case 'gzip': return promisify(zlib.gzip)(bytes);
    case 'deflate': return promisify(zlib.deflate)(bytes);
    case 'br': return promisify(zlib.brotliCompress)(bytes);
    case 'zstd': return promisify((zlib as AnyRecord).zstdCompress)(bytes) as Promise<Buffer>;
    default: throw new Error('Unsupported encoding');
  }
}
function filteredHeaders(headers: http.IncomingHttpHeaders) {
  const result = { ...headers };
  const hop = String(headers.connection ?? '').split(',').map(name => name.trim().toLowerCase());
  for (const name of [...hop, 'host', 'connection', 'content-length', 'transfer-encoding', 'keep-alive', 'te', 'trailer', 'upgrade', 'proxy-authorization', 'proxy-authenticate']) delete result[name];
  return result;
}
async function forward(req: http.IncomingMessage, res: http.ServerResponse) {
  const address = new URL(req.url ?? '/', 'http://127.0.0.1');
  const match = /^\/([a-f0-9]{48})(\/responses(?:\/compact)?|\/models)$/.exec(address.pathname);
  const route = match ? routes.get(match[1]) : undefined;
  if (!match || !route || !['POST','GET'].includes(req.method ?? '') || (req.method === 'GET') !== (match[2] === '/models')) {
    res.writeHead(404).end(); return;
  }
  const controller = new AbortController();
  req.once('aborted', () => controller.abort());
  res.once('close', () => { if (!res.writableFinished) controller.abort(); });
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of req) {
    received += chunk.length;
    if (received > bodyLimit()) throw new AppError('Codex request exceeds the local proxy body limit.', { code: 'CODEX_PROXY_BODY_LIMIT', statusCode: 413 });
    chunks.push(chunk);
  }
  const original = Buffer.concat(chunks);
  let outgoing: Buffer = original;
  let measurement: { requestBytesBefore: number; requestBytesAfter: number; jsonBytesBefore: number; jsonBytesAfter: number } | null = null;
  if (req.method === 'POST' && route.lease) {
    const encoding = String(req.headers['content-encoding'] ?? '').trim().toLowerCase();
    const decoded = await decode(original, encoding);
    const body: AnyRecord = JSON.parse(decoded.toString('utf8'));
    const thread = req.headers['thread-id'] ?? req.headers['session-id'] ?? body.prompt_cache_key;
    // Forked/background agents can inherit a URL. They stay transparent rather
    // than receiving the parent session's policy, pins or attachment catalogue.
    if (thread === route.threadId) {
      await codexImageContextService.filter(route.sessionId, body, route.lease);
      const transformed = Buffer.from(JSON.stringify(body));
      outgoing = await encode(transformed, encoding);
      measurement = { requestBytesBefore: original.length, requestBytesAfter: outgoing.length,
        jsonBytesBefore: decoded.length, jsonBytesAfter: transformed.length };
    }
  }
  if (controller.signal.aborted) return;
  const target = new URL(route.upstream);
  target.pathname = target.pathname.replace(/\/$/, '') + match[2];
  for (const [key,value] of address.searchParams) target.searchParams.append(key,value);
  const transport = target.protocol === 'https:' ? https : http;
  const headers = filteredHeaders(req.headers);
  headers['content-length'] = String(outgoing.length);
  await new Promise<void>((resolve,reject) => {
    const upstream = transport.request(target, { method: req.method, headers, agent, signal: controller.signal }, response => {
      res.writeHead(response.statusCode ?? 502, filteredHeaders(response.headers));
      void pipeline(response, res).then(resolve,reject);
    });
    // Codex owns its configured deadlines; its cancellation closes this stream.
    upstream.once('error', reject);
    if (measurement) upstream.once('finish', () => {
      try { codexImageContextService.recordHttp(route.sessionId, measurement!); }
      catch { console.warn('[Codex image proxy]', { code: 'CODEX_PROXY_METRICS_WRITE' }); }
    });
    upstream.end(outgoing);
  });
}
function listen() {
  listening ??= new Promise<string>((resolve,reject) => {
    const server = http.createServer((req,res) => {
      void forward(req,res).catch(error => {
        if (res.headersSent) { res.destroy(); return; }
        if (res.destroyed) return;
        // Do not expose upstream URLs, headers or prompt contents in diagnostics.
        const known = error instanceof AppError;
        const code = known ? error.code : 'CODEX_IMAGE_PROXY_FAILED';
        console.warn('[Codex image proxy]', { code });
        res.writeHead(known ? error.statusCode : 502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: known ? error.message : 'Local Codex image filtering or upstream connection failed; original history is intact.', code } }));
      });
    });
    server.on('upgrade', (req,socket) => {
      const match = /^\/([a-f0-9]{48})\/responses(?:\?.*)?$/.exec(req.url ?? '');
      const valid = match && routes.has(match[1]);
      // Codex treats 426 as immediate HTTP fallback (400/404 trigger retries).
      socket.end(`HTTP/1.1 ${valid ? '426 Upgrade Required' : '404 Not Found'}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    });
    server.headersTimeout = 30000;
    server.requestTimeout = 0;
    server.once('error', error => { listening = null; reject(error); });
    server.listen(0,'127.0.0.1', () => {
      server.unref();
      resolve(`http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`);
    });
  });
  return listening;
}

/** Provider runtime uses a loopback route per stable app session; only thread-local config overrides are returned. */
export const codexImageProxyService = {
  async open(input: Parameters<NonNullable<ProviderRuntimeContext['openImageContext']>>[0]) {
    if (process.env.CLOUDCLI_CODEX_IMAGE_CONTEXT_ENABLED === 'false') return null;
    const read = await input.request('config/read', { includeLayers: false, cwd: input.cwd }) as AnyRecord;
    const config = read?.config;
    const providerId = typeof config?.model_provider === 'string' ? config.model_provider : 'openai';
    const provider = config?.model_providers?.[providerId];
    if (provider?.wire_api && provider.wire_api !== 'responses') return null;
    let base = provider?.base_url || (providerId === 'openai' ? config?.openai_base_url || process.env.OPENAI_BASE_URL : undefined);
    if (providerId === 'openai') {
      const account = await input.request('account/read', { refreshToken: false }) as AnyRecord;
      base ||= account?.account?.type === 'chatgpt' ? 'https://chatgpt.com/backend-api/codex' : 'https://api.openai.com/v1';
    }
    if (typeof base !== 'string') throw new AppError('Codex provider has no resolvable upstream URL.', { code: 'CODEX_PROXY_PROVIDER', statusCode: 409 });
    const upstream = new URL(base);
    if (!['http:','https:'].includes(upstream.protocol) || upstream.username || upstream.password) throw new AppError('Invalid Codex upstream URL.', { code: 'CODEX_PROXY_PROVIDER', statusCode: 409 });
    let saved = sessionRoutes.get(input.sessionId);
    if (!saved || saved.route.upstream.href !== upstream.href) {
      const token = randomBytes(24).toString('hex');
      saved = { token, route: { sessionId: input.sessionId, upstream, threadId: null, lease: null } };
      routes.set(token,saved.route); sessionRoutes.set(input.sessionId,saved);
    }
    const route = saved.route;
    const policy = codexImageContextService.snapshot(input.sessionId).policy;
    const lease: CodexImageFilterLease = { policy, initialized: false, knownIds: new Set(), protectedIds: new Set() };
    route.lease = lease;
    const url = `${await listen()}/${saved.token}`;
    // Builtin OpenAI IDs are reserved. Its supported base override plus the
    // native HTTP-426 fallback preserve the provider identity and resume picker.
    const configKey = /^[A-Za-z0-9_-]+$/.test(providerId) ? providerId : JSON.stringify(providerId);
    const overrides: AnyRecord = providerId === 'openai' ? { openai_base_url: url } : {
      [`model_providers.${configKey}.base_url`]: url,
      [`model_providers.${configKey}.supports_websockets`]: false,
    };
    return { config: overrides,
      bindThread: (threadId: string) => { route.threadId = threadId; },
      close: () => { if (route.lease === lease) route.lease = null; } };
  },
};
