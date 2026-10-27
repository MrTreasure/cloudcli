import fsp from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

import type { FetchHistoryResult } from '@/shared/types.js';

type Identity = { transcriptPath: string; mtimeMs: number; size: number; ino: number; dev: number; ctimeMs: number };
type CacheEntry = { identity: Identity; full: FetchHistoryResult; cost: number; touchedAt: number };
type PendingLoad = { identity: Identity; promise: Promise<FetchHistoryResult> };
type GetFullHistoryArgs = {
  sessionId: string;
  transcriptPath: string | null | undefined;
  loadFull: () => Promise<FetchHistoryResult>;
};
const MAX_ESTIMATED_HEAP_BYTES = 128 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 8;
const MAX_IDLE_MS = 5 * 60 * 1000;

// Account for UTF-16 strings, object/array slots and shared references without
// allocating a second serialized transcript. This is a conservative estimate,
// not a claim to measure V8's exact retained heap.
function estimatedHeapBytes(value: unknown, ceiling: number): number {
  const seen = new WeakSet<object>();
  const remaining: unknown[] = [value];
  let bytes = 0;
  while (remaining.length && bytes <= ceiling) {
    const item = remaining.pop();
    if (typeof item === 'string') bytes += item.length * 2 + 24;
    else if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item);
      bytes += 128;
      if (ArrayBuffer.isView(item)) bytes += item.byteLength;
      else for (const key of Object.keys(item)) {
        bytes += key.length * 2 + 16;
        remaining.push((item as Record<string, unknown>)[key]);
      }
    } else bytes += 8;
  }
  return bytes;
}
function sameIdentity(a: Identity, b: Identity): boolean {
  return a.transcriptPath === b.transcriptPath && a.mtimeMs === b.mtimeMs && a.size === b.size
    && a.ino === b.ino && a.dev === b.dev && a.ctimeMs === b.ctimeMs;
}
async function identify(transcriptPath: string): Promise<Identity | null> {
  try {
    const stat = await fsp.stat(transcriptPath);
    return stat.isFile() ? { transcriptPath, size: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs, ino: stat.ino, dev: stat.dev } : null;
  } catch { return null; }
}

/** Sessions service caches normalized transcripts; tests and diagnostics inspect aggregate costs only. */
export function createSessionHistoryCache(
  maxEstimatedHeapBytes = MAX_ESTIMATED_HEAP_BYTES,
  maxEntries = MAX_CACHE_ENTRIES,
  maxIdleMs = MAX_IDLE_MS,
) {
  const entries = new Map<string, CacheEntry>();
  const pendingLoads = new Map<string, PendingLoad>();
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let hits = 0;
  let misses = 0;
  let coalescedLoads = 0;
  let rejectedOversize = 0;

  function prune(): void {
    const now = performance.now();
    let total = 0;
    for (const [key, entry] of entries) {
      if (now - entry.touchedAt >= maxIdleMs) entries.delete(key);
      else total += entry.cost;
    }
    for (const [key, entry] of entries) {
      if (total <= maxEstimatedHeapBytes && entries.size <= maxEntries) break;
      entries.delete(key);
      total -= entry.cost;
    }
    clearTimeout(expiry);
    expiry = undefined;
    if (entries.size) {
      const oldest = entries.values().next().value!;
      expiry = setTimeout(prune, Math.max(1, maxIdleMs - (now - oldest.touchedAt)));
      expiry.unref();
    }
  }

  return {
    async getFullHistory({ sessionId, transcriptPath, loadFull }: GetFullHistoryArgs): Promise<FetchHistoryResult | null> {
      if (!transcriptPath) return null;
      const identity = await identify(transcriptPath);
      if (!identity) { entries.delete(sessionId); pendingLoads.delete(sessionId); prune(); return null; }
      prune();
      const cached = entries.get(sessionId);
      if (cached && sameIdentity(cached.identity, identity)) {
        hits += 1;
        entries.delete(sessionId);
        entries.set(sessionId, { ...cached, touchedAt: performance.now() });
        prune();
        return cached.full;
      }
      entries.delete(sessionId);
      const pending = pendingLoads.get(sessionId);
      if (pending && sameIdentity(pending.identity, identity)) {
        coalescedLoads += 1;
        return pending.promise;
      }
      misses += 1;
      const record: PendingLoad = { identity, promise: Promise.resolve(null as unknown as FetchHistoryResult) };
      record.promise = Promise.resolve().then(loadFull).then(async full => {
        const after = await identify(transcriptPath);
        // Invalidation, replacement, a new load or a growing live transcript
        // must never let an older parse re-populate the cache.
        if (pendingLoads.get(sessionId) === record && after && sameIdentity(identity, after)) {
          const cost = estimatedHeapBytes(full, maxEstimatedHeapBytes);
          if (cost <= maxEstimatedHeapBytes && maxEntries > 0 && maxIdleMs > 0) {
            entries.set(sessionId, { identity, full, cost, touchedAt: performance.now() });
            prune();
          } else rejectedOversize += 1;
        }
        return full;
      }).finally(() => {
        if (pendingLoads.get(sessionId) === record) pendingLoads.delete(sessionId);
      });
      pendingLoads.set(sessionId, record);
      return record.promise;
    },
    /** Runtime lifecycle changes fence in-flight loads as well as cached entries. */
    invalidate(sessionId: string): void {
      entries.delete(sessionId);
      pendingLoads.delete(sessionId);
      prune();
    },
    /** Aggregate diagnostics contain no transcript text, session IDs or paths. */
    getStatistics() {
      prune();
      return { entries: entries.size, estimatedHeapBytes: [...entries.values()].reduce((sum, entry) => sum + entry.cost, 0),
        budgetBytes: maxEstimatedHeapBytes, pendingLoads: pendingLoads.size, hits, misses, coalescedLoads, rejectedOversize };
    },
  };
}

/** Used by sessions service and provider runtime invalidation. */
export const sessionHistoryCache = createSessionHistoryCache();
