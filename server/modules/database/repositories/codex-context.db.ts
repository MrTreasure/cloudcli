import { getConnection } from '@/modules/database/connection.js';
import type { CodexContextState } from '@/shared/types.js';

/** Used by Providers to persist image policy, statistics and original-rollout references per stable app session. */
export const codexContextDb = {
  get(sessionId: string): CodexContextState | null {
    const row = getConnection().prepare('SELECT state_json FROM codex_context_state WHERE session_id = ?').get(sessionId) as { state_json: string } | undefined;
    return row ? JSON.parse(row.state_json) as CodexContextState : null;
  },
  save(sessionId: string, state: CodexContextState): void {
    getConnection().prepare(`INSERT INTO codex_context_state(session_id, state_json) VALUES (?, ?)
      ON CONFLICT(session_id) DO UPDATE SET state_json = excluded.state_json`).run(sessionId, JSON.stringify(state));
  },
};
