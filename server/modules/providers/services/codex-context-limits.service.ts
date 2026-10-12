import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parse } from '@iarna/toml';

type CodexModelLimits = {
  slug?: string;
  context_window?: number | null;
  max_context_window?: number | null;
  effective_context_window_percent?: number | null;
  auto_compact_token_limit?: number | null;
};

export type CodexContextLimits = {
  configuredContextWindow: number;
  usableContextWindow: number;
  autoCompactThreshold: number;
  postTurnCompactThreshold: number | null;
};

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * Used by the provider token-usage reader and history service to resolve the
 * same model window and compaction limits as the locally installed Codex CLI.
 * Returns null when the model catalog cannot establish a reliable window.
 */
export function readCodexContextLimits(model?: string | null, codexHome?: string): CodexContextLimits | null {
  try {
    const home = codexHome || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
    const config = parse(fs.readFileSync(path.join(home, 'config.toml'), 'utf8')) as Record<string, unknown>;
    const catalogPath = typeof config.model_catalog_json === 'string'
      ? config.model_catalog_json
      : path.join(home, 'models_cache.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as { models?: CodexModelLimits[] };
    const modelSlug = model || (typeof config.model === 'string' ? config.model : null);
    const entry = catalog.models?.find((candidate) => candidate.slug === modelSlug);
    if (!entry) return null;

    const modelWindow = positiveInteger(entry.context_window) ?? positiveInteger(entry.max_context_window);
    const maxWindow = positiveInteger(entry.max_context_window);
    const requestedWindow = positiveInteger(config.model_context_window) ?? modelWindow;
    if (!requestedWindow) return null;
    const configuredContextWindow = maxWindow ? Math.min(requestedWindow, maxWindow) : requestedWindow;
    const percent = positiveInteger(entry.effective_context_window_percent) ?? 95;
    const usableContextWindow = Math.floor(configuredContextWindow * percent / 100);
    const autoCompactThreshold = Math.min(
      positiveInteger(config.model_auto_compact_token_limit)
        ?? positiveInteger(entry.auto_compact_token_limit)
        ?? Math.floor(configuredContextWindow * 0.9),
      Math.floor(configuredContextWindow * 0.9),
    );
    const postTurnPercent = positiveInteger(config.model_post_turn_compact_threshold_percent);
    return {
      configuredContextWindow,
      usableContextWindow,
      autoCompactThreshold,
      postTurnCompactThreshold: postTurnPercent
        ? Math.floor(usableContextWindow * Math.min(postTurnPercent, 100) / 100)
        : null,
    };
  } catch {
    return null;
  }
}
