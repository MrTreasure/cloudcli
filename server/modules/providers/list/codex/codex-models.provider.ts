import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import TOML from '@iarna/toml';

import type { IProviderModels } from '@/shared/interfaces.js';
import type {
  ProviderCurrentActiveModel,
  ProviderModelsDefinition,
  ProviderModelOption,
} from '@/shared/types.js';
import {
  buildDefaultProviderCurrentActiveModel,
  readObjectRecord,
  readOptionalString,
} from '@/shared/utils.js';

/** Curated Codex catalog shipped as immutable CloudCLI defaults. */
export const CODEX_PREDEFINED_MODELS: ProviderModelsDefinition = {
  OPTIONS: [
    {
      value: 'gpt-6-astra',
      label: 'GPT-6 Astra',
      description: 'Our most capable model for complex, demanding work.',
      effort: {
        default: 'low',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'xhigh' },
          { value: 'max' },
          { value: 'ultra' },
        ],
      },
    },
    {
      value: 'gpt-6-sol',
      label: 'GPT-6 Sol',
      description: 'Workhorse model for coding and everyday work.',
      effort: {
        default: 'medium',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'xhigh' },
          { value: 'max' },
          { value: 'ultra' },
        ],
      },
    },
    {
      value: 'gpt-6-luna',
      label: 'GPT-6 Luna',
      description: 'Fast and affordable model for easier tasks.',
      effort: {
        default: 'medium',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'xhigh' },
          { value: 'max' },
        ],
      },
    },
    {
      value: 'gpt-5.6-sol',
      label: 'GPT-5.6 Sol',
      description: 'Latest frontier agentic coding model.',
      effort: {
        default: 'low',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'xhigh' },
          { value: 'max' },
          { value: 'ultra' },
        ],
      },
    },
    {
      value: 'gpt-5.6-terra',
      label: 'GPT-5.6 Terra',
      description: 'Balanced agentic coding model for everyday work.',
      effort: {
        default: 'medium',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'xhigh' },
          { value: 'max' },
          { value: 'ultra' },
        ],
      },
    },
    {
      value: 'gpt-5.6-luna',
      label: 'GPT-5.6 Luna',
      description: 'Fast and affordable agentic coding model.',
      effort: {
        default: 'medium',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'xhigh' },
          { value: 'max' },
        ],
      },
    },
    {
      value: 'gpt-5.5',
      label: 'GPT-5.5',
      description: 'Frontier model for complex coding, research, and real-world work.',
      effort: {
        default: 'medium',
        values: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }, { value: 'xhigh' }],
      },
    },
    {
      value: 'gpt-5.4',
      label: 'GPT-5.4',
      description: 'Strong model for everyday coding.',
      effort: {
        default: 'medium',
        values: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }, { value: 'xhigh' }],
      },
    },
    {
      value: 'gpt-5.4-mini',
      label: 'GPT-5.4 Mini',
      description: 'Small, fast, and cost-efficient model for simpler coding tasks.',
      effort: {
        default: 'medium',
        values: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }, { value: 'xhigh' }],
      },
    },
  ],
  DEFAULT: 'gpt-5.6-sol',
};

const CODEX_CONFIG_PATH = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'config.toml');

/** Provider registry model adapter for Codex predefined models and active config. */
export class CodexProviderModels implements IProviderModels {
  private discovery?: {
    key: string;
    catalog: ProviderModelsDefinition;
    expiresAt: number;
    pending?: Promise<ProviderModelsDefinition>;
  };

  constructor(private readonly options: {
    configPath?: string;
    fetch?: typeof fetch;
    now?: () => number;
  } = {}) {}

  async getSupportedModels(): Promise<ProviderModelsDefinition> {
    const configPath = this.options.configPath ?? CODEX_CONFIG_PATH;
    try {
      const config = readObjectRecord(TOML.parse(await readFile(configPath, 'utf8')));
      const providerId = readOptionalString(config?.model_provider);
      const providers = readObjectRecord(config?.model_providers);
      const provider = providerId ? readObjectRecord(providers?.[providerId]) : null;
      const baseUrl = readOptionalString(provider?.base_url);
      // Default OpenAI/ChatGPT installations retain the shipped catalog. Only
      // discover through the gateway explicitly selected by this computer.
      if (!baseUrl) return CODEX_PREDEFINED_MODELS;
      const url = new URL(baseUrl.replace(/\/$/, '') + '/models');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        return CODEX_PREDEFINED_MODELS;
      }
      // CPA's Codex-compatible catalog includes display names and reasoning
      // metadata. Standard OpenAI-compatible gateways may still return `data`.
      url.searchParams.set('client_version', 'cpa');
      let token = readOptionalString(provider?.experimental_bearer_token);
      const envKey = readOptionalString(provider?.env_key);
      if (!token && envKey) {
        token = readOptionalString(process.env[envKey]);
        if (!token) return CODEX_PREDEFINED_MODELS;
      }
      if (!token && provider?.requires_openai_auth === true) {
        const auth = readObjectRecord(JSON.parse(await readFile(path.join(path.dirname(configPath), 'auth.json'), 'utf8')));
        token = readOptionalString(auth?.OPENAI_API_KEY);
        // Never send ChatGPT OAuth credentials to a configured third party.
        if (!token) return CODEX_PREDEFINED_MODELS;
      }
      const key = createHash('sha256').update(url.href).update('\0').update(token ?? '').digest('hex');
      const now = this.options.now ?? Date.now;
      let state = this.discovery;
      if (!state || state.key !== key) {
        state = { key, catalog: CODEX_PREDEFINED_MODELS, expiresAt: 0 };
        this.discovery = state;
      }
      if (state.pending) return state.pending;
      if (now() < state.expiresAt) return state.catalog;
      const current = state;
      current.pending = Promise.resolve().then(async () => {
        try {
          const response = await (this.options.fetch ?? fetch)(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: AbortSignal.timeout(5000),
            redirect: 'error',
          });
          if (!response.ok || !response.body) throw new Error('Model discovery failed');
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let length = 0;
          try {
            while (true) {
              const chunk = await reader.read();
              if (chunk.done) break;
              length += chunk.value.length;
              if (length > 8 * 1024 * 1024) throw new Error('Model catalog too large');
              chunks.push(chunk.value);
            }
          } finally {
            await reader.cancel();
          }
          const body = readObjectRecord(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          const entries = Array.isArray(body?.models) ? body.models : body?.data;
          if (!Array.isArray(entries)) throw new Error('Invalid model catalog');
          const options = new Map<string, ProviderModelOption>();
          // Keep known metadata and existing choices; additions from the gateway
          // have no guessed reasoning levels. Manual rows override them later.
          for (const option of CODEX_PREDEFINED_MODELS.OPTIONS) options.set(option.value, option);
          let hasSupportedModel = false;
          for (const entry of entries) {
            const row = readObjectRecord(entry);
            const id = readOptionalString(row?.slug) ?? readOptionalString(row?.id);
            if (!id || row?.visibility === 'hide' || id === 'codex-auto-review' || id.length > 200 || !/^(?:gpt-|o[1-9](?:-|$)|codex-)/i.test(id)
              || /(?:image|audio|realtime|transcribe|tts|embedding|search|moderation)/i.test(id)) continue;
            hasSupportedModel = true;
            const known = options.get(id);
            const levels = new Map<string, { value: string; description?: string }>();
            if (Array.isArray(row?.supported_reasoning_levels)) {
              for (const rawLevel of row.supported_reasoning_levels) {
                const level = readObjectRecord(rawLevel);
                const value = readOptionalString(level?.effort);
                if (!value || !['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(value)) continue;
                const description = readOptionalString(level?.description);
                levels.set(value, { value, ...(description ? { description } : {}) });
              }
            }
            const defaultLevel = readOptionalString(row?.default_reasoning_level);
            options.set(id, {
              ...(known ?? { value: id, label: id, description: 'Configured gateway' }),
              label: readOptionalString(row?.display_name) ?? known?.label ?? id,
              isDiscovered: true,
              ...(levels.size ? { effort: {
                values: [...levels.values()],
                ...(defaultLevel && levels.has(defaultLevel) ? { default: defaultLevel } : {}),
              } } : {}),
            });
          }
          if (!hasSupportedModel) {
            throw new Error('Empty model catalog');
          }
          current.catalog = { OPTIONS: [...options.values()], DEFAULT: CODEX_PREDEFINED_MODELS.DEFAULT };
          current.expiresAt = now() + 60_000;
        } catch {
          // Retry only on demand after a bounded cooldown, retaining the last
          // successful catalog. Never log URLs, response bodies or credentials.
          current.expiresAt = now() + 30_000;
        } finally {
          current.pending = undefined;
        }
        return current.catalog;
      });
      return current.pending;
    } catch {
      return CODEX_PREDEFINED_MODELS;
    }
  }

  async getCurrentActiveModel(): Promise<ProviderCurrentActiveModel> {
    try {
      const raw = await readFile(this.options.configPath ?? CODEX_CONFIG_PATH, 'utf8');
      const parsed = readObjectRecord(TOML.parse(raw));
      const model = readOptionalString(parsed?.model);
      if (!model) {
        return buildDefaultProviderCurrentActiveModel(await this.getSupportedModels());
      }

      return {
        model,
      };
    } catch {
      return buildDefaultProviderCurrentActiveModel(await this.getSupportedModels());
    }
  }
}
