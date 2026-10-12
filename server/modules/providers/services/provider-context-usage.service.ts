import type { AnyRecord } from '@/shared/index.js';

/** Used by the Claude runtime to read native context occupancy without per-category API calls. */
export async function readClaudeContextUsage(query: {
  getContextUsage?: (options: { detail: 'summary' }) => Promise<unknown>;
}): Promise<AnyRecord | null> {
  if (!query.getContextUsage) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      query.getContextUsage({ detail: 'summary' }),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 2000); }),
    ]);
    if (!value || typeof value !== 'object') return null;
    const report = value as Record<string, unknown>;
    const used = Number(report.totalTokens);
    const total = Number(report.rawMaxTokens);
    if (!Number.isFinite(used) || used < 0 || !Number.isFinite(total) || total <= 0) return null;
    return { used, total };
  } catch {
    // Older CLI versions may reject this control request; retain the latest assistant usage.
    return null;
  } finally { if (timer) clearTimeout(timer); }
}
