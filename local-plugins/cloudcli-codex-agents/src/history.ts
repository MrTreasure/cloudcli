import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { CodexAgentSummary } from '../../../src/shared/types';

type Marker = { revision: string; project: string };
const canHide = (agent: CodexAgentSummary) => ['completed', 'stopped', 'failed', 'unknown'].includes(agent.status);

/** Own panel preferences only; native SQLite, rollouts and running agents are never modified. */
export class AgentHistory {
  private readonly directory: string;

  constructor(directory = path.join(os.homedir(), '.claude-code-ui', 'plugin-state', 'codex-agents')) { this.directory = directory; }

  private filename(account: string): string {
    if (!account || account.length > 128) throw new Error('Authenticated account unavailable');
    return path.join(this.directory, `${createHash('sha256').update(account).digest('hex')}.json`);
  }

  private read(account: string): Record<string, Marker> {
    try {
      const value = JSON.parse(fs.readFileSync(this.filename(account), 'utf8'));
      if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Invalid panel state');
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw error;
    }
  }

  visible(account: string, rows: CodexAgentSummary[]): CodexAgentSummary[] {
    const markers = this.read(account);
    return rows.filter((row) => !canHide(row) || markers[row.id]?.revision !== row.revision || markers[row.id]?.project !== row.projectPath);
  }

  clear(account: string, agents: CodexAgentSummary[]): void {
    // Synchronous read/merge/rename executes atomically within this single worker.
    // Concurrent HTTP requests cannot interleave read-modify-write or lose markers.
    const markers = this.read(account);
    for (const agent of agents) {
      if (!canHide(agent)) throw new Error('Running records cannot be cleared');
      markers[agent.id] = { revision: agent.revision, project: agent.projectPath };
    }
    const parent = path.dirname(this.directory);
    fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
    fs.chmodSync(parent, 0o700);
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(this.directory, 0o700);
    const filename = this.filename(account);
    const temporary = `${filename}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(markers), { mode: 0o600, flag: 'wx' });
      fs.chmodSync(temporary, 0o600);
      fs.renameSync(temporary, filename);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
  }
}
