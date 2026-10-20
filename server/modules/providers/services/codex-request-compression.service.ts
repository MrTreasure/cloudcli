import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import * as zlib from 'node:zlib';

import type { AnyRecord, CodexRequestCompressionSettings } from '@/shared/types.js';
import { AppError } from '@/shared/utils.js';

function failure(message: string, code: string, statusCode: number): AppError {
  return new AppError(message, { code, statusCode });
}

/** The Codex loopback proxy uses this codec before its first upstream write; it never retries a request. */
export const codexRequestCompressionService = {
  settings(): CodexRequestCompressionSettings {
    const mode = process.env.CLOUDCLI_CODEX_REQUEST_COMPRESSION ?? 'preserve';
    if (!['preserve', 'identity', 'zstd', 'gzip'].includes(mode)) {
      throw failure('Invalid CLOUDCLI_CODEX_REQUEST_COMPRESSION.', 'CODEX_PROXY_COMPRESSION_CONFIG', 500);
    }
    const gzipOrigins = (process.env.CLOUDCLI_CODEX_REQUEST_GZIP_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean);
    for (const origin of gzipOrigins) {
      let parsed: URL;
      try { parsed = new URL(origin); } catch { throw failure('Invalid confirmed gzip origin.', 'CODEX_PROXY_COMPRESSION_CONFIG', 500); }
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
        throw failure('Confirmed gzip entries must be exact HTTP origins without paths or credentials.', 'CODEX_PROXY_COMPRESSION_CONFIG', 500);
      }
    }
    const maxCompressedBytes = Number(process.env.CLOUDCLI_CODEX_PROXY_COMPRESSED_BODY_BYTES ?? 16 * 1048576);
    if (!Number.isSafeInteger(maxCompressedBytes) || maxCompressedBytes < 4096 || maxCompressedBytes > 64 * 1048576) {
      throw failure('Invalid compressed request-body limit.', 'CODEX_PROXY_COMPRESSION_CONFIG', 500);
    }
    return { mode: mode as CodexRequestCompressionSettings['mode'], gzipOrigins, maxCompressedBytes };
  },

  async decode(bytes: Buffer, encoding: string, maximum: number, signal: AbortSignal): Promise<Buffer> {
    signal.throwIfAborted();
    // Node's zlib streams inherit AbortSignal from Transform options, including
    // the convenience methods. Its historical TS option interfaces omit it.
    const options = { maxOutputLength: maximum, signal };
    try {
      switch (encoding) {
        case '': case 'identity': return bytes;
        case 'gzip': return await promisify(zlib.gunzip)(bytes, options);
        case 'deflate': return await promisify(zlib.inflate)(bytes, options);
        case 'br': return await promisify(zlib.brotliDecompress)(bytes, options);
        case 'zstd': {
          const decoder = (zlib as AnyRecord).zstdDecompress;
          if (!decoder) throw failure('This Node version cannot decode zstd requests. Upgrade to Node 22.15+.', 'CODEX_PROXY_ENCODING', 415);
          return await promisify(decoder)(bytes, options) as Buffer;
        }
        default: throw failure('Unsupported or chained request encoding.', 'CODEX_PROXY_ENCODING', 415);
      }
    } catch (error) {
      if (signal.aborted || error instanceof AppError) throw error;
      if ((error as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE') {
        throw failure('Decoded request exceeds the local JSON limit.', 'CODEX_PROXY_BODY_LIMIT', 413);
      }
      throw failure('Invalid compressed request body.', 'CODEX_PROXY_BODY_INVALID', 400);
    }
  },

  async encode(bytes: Buffer, incoming: string, settings: CodexRequestCompressionSettings, origin: string, signal: AbortSignal) {
    signal.throwIfAborted();
    const start = performance.now();
    let encoding = settings.mode === 'preserve' ? incoming || 'identity' : settings.mode;
    if (bytes.length < 4096) encoding = 'identity';
    if (encoding === 'zstd' && typeof (zlib as AnyRecord).zstdCompress !== 'function') {
      if (settings.mode === 'zstd' && settings.gzipOrigins.includes(origin)) encoding = 'gzip';
      else throw failure('zstd is unavailable and gzip has not been confirmed for this upstream.', 'CODEX_PROXY_ENCODING', 415);
    }
    if (encoding === 'gzip' && settings.mode !== 'preserve' && !settings.gzipOrigins.includes(origin)) {
      throw failure('Deploy the CPA gzip fix and confirm its exact origin before enabling gzip.', 'CODEX_PROXY_GZIP_UNCONFIRMED', 415);
    }
    let outgoing: Buffer = bytes;
    try {
      // Enough room to recognize a non-beneficial conversion at the JSON limit.
      const options = { signal, maxOutputLength: bytes.length + 1048576 };
      switch (encoding) {
        case 'identity': break;
        case 'gzip': outgoing = await promisify(zlib.gzip)(bytes, { ...options, level: 1 }); break;
        case 'zstd': outgoing = await promisify((zlib as AnyRecord).zstdCompress)(bytes, {
          ...options, params: { [zlib.constants.ZSTD_c_compressionLevel]: 3 },
        }) as Buffer; break;
        case 'deflate': outgoing = await promisify(zlib.deflate)(bytes, { ...options, level: 1 }); break;
        case 'br': outgoing = await promisify(zlib.brotliCompress)(bytes, options); break;
        default: throw failure('Unsupported request encoding.', 'CODEX_PROXY_ENCODING', 415);
      }
    } catch (error) {
      if (signal.aborted || error instanceof AppError) throw error;
      throw failure('Request compression failed before upstream transmission.', 'CODEX_PROXY_COMPRESSION_FAILED', 500);
    }
    signal.throwIfAborted();
    // Select once before any network write. Never replay after an HTTP error.
    if (outgoing.length >= bytes.length) {
      outgoing = bytes; encoding = 'identity';
    }
    if (settings.mode !== 'preserve' && encoding !== 'identity' && outgoing.length > settings.maxCompressedBytes) {
      throw failure('Encoded request exceeds the configured compressed-body limit.', 'CODEX_PROXY_BODY_LIMIT', 413);
    }
    return { bytes: outgoing, encoding, compressionMs: Math.round((performance.now() - start) * 1000) / 1000 };
  },
};
