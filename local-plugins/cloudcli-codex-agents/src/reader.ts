import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { CodexAgentActivity, CodexAgentDetail, CodexAgentStatus, CodexAgentSummary, CodexAgentsSnapshot } from '../../../src/shared/types';

type Row = {
  id: string; rollout_path: string; source: string; cwd: string; title: string;
  created_at: number; updated_at: number; agent_path: string | null;
  agent_nickname: string | null; model: string | null; name: string | null;
};
type RecordValue = Record<string, unknown>;
type Timeline = { activities: CodexAgentActivity[]; lifecycle: CodexAgentStatus; at: string | null; truncated: boolean; available: boolean; revision: string };
const object = (value: unknown): RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const string = (value: unknown): string => typeof value === 'string' ? value : '';
const parse = (value: string): RecordValue => { try { return object(JSON.parse(value)); } catch { return {}; } };
const text = (value: unknown): string => typeof value === 'string' ? value : Array.isArray(value)
  ? value.map((part) => typeof part === 'string' ? part : string(object(part).text)).filter(Boolean).join('\n') : '';
const iso = (seconds: number): string => new Date(seconds * 1000).toISOString();
const safeText = (value: string, max = 4000): string => value
  .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [已隐藏]')
  .replace(/\bsk-[A-Za-z0-9_-]{16,}/g, '[密钥已隐藏]')
  .replace(/data:image\/[^;\s]+;base64,[A-Za-z0-9+/=]+/g, '[图片数据]')
  .slice(0, max);

// Scan across large image/output lines without allocating or parsing them.
// Typical polls stop after a few blocks; cold reads have a fixed 8 MiB I/O cap.
function readRecentRecords(filename: string, size: number, limit: number): { records: RecordValue[]; truncated: boolean } {
  const records: RecordValue[] = [];
  const descriptor = fs.openSync(filename, 'r');
  const block = Buffer.alloc(64 * 1024);
  let position = size;
  const lowerBound = Math.max(0, size - 8 * 1024 * 1024);
  let pieces: Buffer[] = [];
  let lineBytes = 0;
  let oversized = false;
  let skipped = false;
  const append = (piece: Buffer) => {
    lineBytes += piece.length;
    if (lineBytes > 64 * 1024) { oversized = true; pieces = []; skipped = true; }
    else if (!oversized && piece.length) pieces.push(Buffer.from(piece));
  };
  const finish = () => {
    if (!oversized && pieces.length) {
      const value = parse(Buffer.concat(pieces.reverse()).toString('utf8'));
      if (typeof value.timestamp === 'string') records.push(value);
    }
    pieces = []; lineBytes = 0; oversized = false;
  };
  try {
    while (position > lowerBound && records.length < limit) {
      const length = Math.min(block.length, position - lowerBound);
      position -= length;
      const bytes = fs.readSync(descriptor, block, 0, length, position);
      let end = bytes;
      for (let index = bytes - 1; index >= 0; index--) {
        if (block[index] !== 10) continue;
        append(block.subarray(index + 1, end)); finish(); end = index;
        if (records.length >= limit) break;
      }
      if (records.length < limit) append(block.subarray(0, end));
    }
    if (position === 0 && records.length < limit) finish();
    return { records: records.reverse(), truncated: position > 0 || skipped };
  } finally { fs.closeSync(descriptor); }
}

/** Plugin RPC server reads only Codex's native index and bounded rollout tails. Tests supply an isolated home. */
export class CodexAgentReader {
  private readonly home: string;
  private readonly cache = new Map<string, { signature: string; identity: string; size: number; value: Timeline }>();

  constructor(home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')) { this.home = home; }

  private database(): DatabaseSync | null {
    if (!fs.existsSync(this.home)) return null;
    const names = fs.readdirSync(this.home).filter((name) => /^state_\d+\.sqlite$/.test(name))
      .sort((a, b) => Number(b.match(/\d+/)?.[0]) - Number(a.match(/\d+/)?.[0]));
    if (!names.length) return null;
    const db = new DatabaseSync(path.join(this.home, names[0]), { readOnly: true });
    db.exec('PRAGMA query_only = ON; PRAGMA busy_timeout = 1000;');
    return db;
  }

  private query(db: DatabaseSync): { select: string; where: string } {
    const columns = new Set((db.prepare('PRAGMA table_info(threads)').all() as { name: string }[]).map((column) => column.name));
    if (!['id', 'source', 'rollout_path', 'cwd', 'title', 'created_at', 'updated_at'].every((name) => columns.has(name))) {
      throw new Error('Unsupported native index');
    }
    const optional = ['agent_path', 'agent_nickname', 'model', 'name'].map((name) => columns.has(name) ? name : `NULL AS ${name}`);
    const where = `(${columns.has('thread_source') ? "thread_source = 'subagent' OR " : ''}(json_valid(source) AND json_type(source, '$.subagent.thread_spawn') = 'object'))`;
    return { select: `SELECT id,source,rollout_path,cwd,title,created_at,updated_at,${optional.join(',')} FROM threads`, where };
  }

  private readTimeline(row: Row, detail: boolean): Timeline {
    const fallback: Timeline = { activities: [], lifecycle: 'unknown', at: null, truncated: false, available: false, revision: 'missing' };
    try {
      const filename = fs.realpathSync(row.rollout_path);
      // A native index may contain stale or malicious paths. Never expose arbitrary files.
      if (!['sessions', 'archived_sessions'].some((folder) => {
        try { return filename.startsWith(fs.realpathSync(path.join(this.home, folder)) + path.sep); } catch { return false; }
      })) return fallback;
      const stat = fs.statSync(filename);
      if (!stat.isFile()) return fallback;
      const key = `${row.id}:${detail}`;
      const identity = `${stat.dev}:${stat.ino}`;
      // Keep public revisions compatible with already-cleared panel records.
      const signature = `${stat.mtimeMs}:${stat.size}`;
      const cached = this.cache.get(key);
      if (cached?.signature === signature && cached.identity === identity) return cached.value;
      const recent = readRecentRecords(filename, stat.size, detail ? 256 : 128);
      const previous = cached?.identity === identity && cached.size < stat.size ? cached.value : undefined;
      const modern = new Map<string, CodexAgentActivity>();
      const legacy = new Map<string, CodexAgentActivity>();
      let lifecycle: CodexAgentStatus = 'unknown';
      let lastAt: string | null = null;
      let heartbeatAt: string | null = null;
      const cutoff = row.created_at * 1000 - 1000;
      const add = (target: Map<string, CodexAgentActivity>, activity: CodexAgentActivity) => {
        target.set(activity.id, { ...activity, label: safeText(activity.label, 220), text: safeText(activity.text) });
      };
      for (const record of recent.records) {
        const payload = object(record.payload);
        const at = string(record.timestamp);
        if (!at || !Number.isFinite(Date.parse(at)) || Date.parse(at) < cutoff) continue;
        // Forks can retain parent history; only native events belonging to this child are admissible.
        if (payload.thread_id && payload.thread_id !== row.id) continue;
        if ((record.type === 'token_usage_record' && payload.thread_id === row.id)
          || (record.type === 'event_msg' && payload.type === 'token_count')) heartbeatAt = at;
        if (record.type === 'event_msg') {
          if (payload.type === 'task_started') lifecycle = 'running';
          if (payload.type === 'task_complete') lifecycle = 'completed';
          if (payload.type === 'turn_aborted' || payload.type === 'task_interrupted') lifecycle = 'stopped';
          if (payload.type === 'turn_failed') lifecycle = 'failed';
          if (['task_started', 'task_complete', 'turn_aborted', 'task_interrupted', 'turn_failed'].includes(string(payload.type))) lastAt = at;
          if (payload.type !== 'item_completed' && payload.type !== 'item_started') continue;
          if (lifecycle === 'unknown') lifecycle = 'running';
          const item = object(payload.item);
          const id = string(item.id) || `${at}:${modern.size}`;
          const type = string(item.type).toLowerCase();
          if (payload.type === 'item_started' || ['commandexecution', 'filechange', 'mcptoolcall', 'dynamictoolcall'].includes(type)) lifecycle = 'running';
          if (type === 'commandexecution') add(modern, { id, at, kind: 'command', label: string(item.command) || '执行命令', text: string(item.aggregated_output) });
          else if (type === 'agentmessage') add(modern, { id, at, kind: 'message', label: 'Agent 回复', text: text(item.content) || string(item.text) });
          else if (type === 'filechange') {
            const changes = Array.isArray(item.changes) ? item.changes.map((value) => string(object(value).path)).filter(Boolean) : [];
            add(modern, { id, at, kind: 'file', label: '修改文件', text: changes.join('\n') || string(item.stdout) });
          } else if (type === 'mcptoolcall' || type === 'dynamictoolcall') add(modern, { id, at, kind: 'tool', label: string(item.tool) || string(item.name) || '调用工具', text: string(item.status) });
          lastAt = at;
        } else if (record.type === 'response_item') {
          const id = string(payload.call_id) || string(payload.id) || `${at}:${legacy.size}`;
          if (payload.type === 'function_call' || payload.type === 'custom_tool_call') {
            lifecycle = 'running';
            lastAt = at;
            const args = parse(string(payload.arguments));
            add(legacy, { id, at, kind: 'tool', label: string(payload.name) || '调用工具', text: string(args.cmd) || string(args.command) || string(payload.input) });
          } else if (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output') {
            const call = legacy.get(id);
            if (call) add(legacy, { ...call, at, text: `${call.text}\n\n${text(payload.output)}` });
          } else if (payload.type === 'message' && payload.role === 'assistant') {
            add(legacy, { id, at, kind: 'message', label: 'Agent 回复', text: text(payload.content) });
            // Explicit completed final messages exist in older native rollouts.
            // Unattributed/fork-inherited final answers remain unknown.
            if (payload.phase === 'final_answer' && payload.status === 'completed'
              && payload.thread_id === row.id) lifecycle = 'completed';
          } else if (payload.type === 'message' && payload.role === 'user') {
            lifecycle = 'running';
            lastAt = at;
          }
        }
      }
      const current = [...(modern.size ? modern : legacy).values()];
      const activities = [...new Map([...(previous?.activities || []), ...current].map((activity) => [activity.id, activity])).values()]
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      if (lifecycle === 'unknown' && previous) { lifecycle = previous.lifecycle; lastAt = previous.at; }
      const latestActivity = activities.at(-1)?.at;
      if (latestActivity && lifecycle === 'unknown') lifecycle = 'running';
      if (latestActivity && (!lastAt || Date.parse(latestActivity) > Date.parse(lastAt))) lastAt = latestActivity;
      if (lifecycle === 'running' && heartbeatAt && (!lastAt || Date.parse(heartbeatAt) > Date.parse(lastAt))) lastAt = heartbeatAt;
      const value: Timeline = { available: true, revision: signature, activities: activities.slice(detail ? -80 : -3), lifecycle, at: lastAt, truncated: recent.truncated || activities.length > (detail ? 80 : 3) };
      this.cache.set(key, { signature, identity, size: stat.size, value });
      if (this.cache.size > 400) this.cache.delete(this.cache.keys().next().value!);
      return value;
    } catch { return fallback; }
  }

  private readonly tasks = new Map<string, { signature: string; task: string; availability: 'available' | 'encrypted' | 'unavailable' }>();

  private parentTitles(): Map<string, string> {
    const titles = new Map<string, string>();
    let db: DatabaseSync | undefined;
    try {
      const filename = process.env.DATABASE_PATH || path.join(os.homedir(), '.cloudcli', 'auth.db');
      if (!fs.existsSync(filename)) return titles;
      db = new DatabaseSync(filename, { readOnly: true });
      db.exec('PRAGMA query_only = ON; PRAGMA busy_timeout = 1000;');
      const rows = db.prepare("SELECT provider_session_id, custom_name FROM sessions WHERE provider = 'codex' AND custom_name IS NOT NULL").all();
      for (const row of rows) if (string(row.custom_name).trim()) titles.set(string(row.provider_session_id), safeText(string(row.custom_name), 160));
    } catch { /* A missing or older app index must not expose native first-message titles. */ }
    finally { db?.close(); }
    return titles;
  }

  private dispatchedTask(row: Row): { task: string; availability: 'available' | 'encrypted' | 'unavailable' } {
    const unavailable = { task: '', availability: 'unavailable' as const };
    try {
      const filename = fs.realpathSync(row.rollout_path);
      if (!['sessions', 'archived_sessions'].some((folder) => {
        try { return filename.startsWith(fs.realpathSync(path.join(this.home, folder)) + path.sep); } catch { return false; }
      })) return unavailable;
      const stat = fs.statSync(filename);
      if (!stat.isFile()) return unavailable;
      const identity = `${stat.dev}:${stat.ino}:`;
      const signature = `${identity}${Math.min(stat.size, 8 * 1024 * 1024)}`;
      const cached = this.tasks.get(row.id);
      if (cached && (cached.signature === signature || (cached.signature.startsWith(identity) && cached.availability !== 'unavailable'))) return cached;
      // Incoming NEW_TASK records are at the start of the child rollout. Never use
      // inherited user messages, native titles, or another child's dispatch.
      const recent = readRecentRecords(filename, Math.min(stat.size, 8 * 1024 * 1024), 100_000);
      let result = unavailable as { task: string; availability: 'available' | 'encrypted' | 'unavailable' };
      for (const record of recent.records) {
        const payload = object(record.payload);
        if (record.type !== 'response_item' || payload.type !== 'agent_message'
          || !row.agent_path || payload.recipient !== row.agent_path
          || Date.parse(string(record.timestamp)) < row.created_at * 1000 - 1000) continue;
        const content = Array.isArray(payload.content) ? payload.content : [];
        const plaintext = content.map((part) => {
          const value = object(part);
          // Native collaboration can retain the encrypted_content discriminator
          // even when the schema requested a plaintext task argument.
          const wrapped = string(value.encrypted_content);
          return value.type === 'encrypted_content' ? (!wrapped.startsWith('gAAAAA') ? wrapped : '') : string(value.text);
        }).join('\n');
        if (!plaintext.startsWith('Message Type: NEW_TASK\n')) continue;
        const task = plaintext.split(/\nPayload:\s*\n/).slice(1).join('\nPayload:\n').trim();
        if (task && !/^gAAAAA/.test(task)) result = { task: safeText(task, 8000), availability: 'available' };
        else if (content.some((part) => object(part).type === 'encrypted_content')) result = { task: '', availability: 'encrypted' };
        break;
      }
      this.tasks.set(row.id, { signature, ...result });
      if (this.tasks.size > 400) this.tasks.delete(this.tasks.keys().next().value!);
      return result;
    } catch { return unavailable; }
  }

  private summary(row: Row, timeline: Timeline, titles: Map<string, string>): CodexAgentSummary {
    const spawn = object(object(parse(row.source).subagent).thread_spawn);
    const parentId = string(spawn.parent_thread_id) || null;
    const task = this.dispatchedTask(row);
    let status = timeline.lifecycle;
    // Lack of a completion marker alone is not proof of a live process after a restart.
    if (status === 'running' && (!timeline.at || Date.now() - Date.parse(timeline.at) > 120_000)) status = 'unknown';
    const name = row.name || row.agent_path?.split('/').filter(Boolean).at(-1) || row.agent_nickname || row.id;
    const latest = timeline.activities.at(-1);
    return {
      id: row.id, parentId, parentTitle: parentId ? titles.get(parentId) || null : null,
      name: safeText(name, 160), nickname: row.agent_nickname, model: row.model,
      task: task.task, taskAvailability: task.availability, projectPath: row.cwd,
      createdAt: iso(row.created_at), updatedAt: iso(row.updated_at), status,
      lastActivity: latest ? safeText(latest.kind === 'message' ? latest.text : latest.label, 180) : '',
      lastActivityAt: timeline.at, recordAvailable: timeline.available,
      revision: `${row.updated_at}:${timeline.revision}:${status}`,
    };
  }

  list(project = '', offset = 0, limit = 40): CodexAgentsSnapshot {
    const db = this.database();
    if (!db) return { available: false, items: [], nextOffset: null, observedAt: new Date().toISOString() };
    try {
      const { select, where } = this.query(db);
      const prefix = project.replace(/[\\/]+$/, '');
      const projectWhere = prefix ? ' AND (cwd = ? OR cwd LIKE ? ESCAPE \'!\')' : '';
      const escaped = prefix.replace(/[!%_]/g, (value) => `!${value}`);
      const rows = db.prepare(`${select} WHERE ${where}${projectWhere} ORDER BY updated_at DESC,id DESC LIMIT ? OFFSET ?`)
        .all(...(prefix ? [prefix, `${escaped}${path.sep}%`] : []), limit + 1, offset) as unknown as Row[];
      const titles = this.parentTitles();
      return { available: true, items: rows.slice(0, limit).map((row) => this.summary(row, this.readTimeline(row, false), titles)), nextOffset: rows.length > limit ? offset + limit : null, observedAt: new Date().toISOString() };
    } finally { db.close(); }
  }

  detail(id: string): CodexAgentDetail | null {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return null;
    const db = this.database();
    if (!db) return null;
    try {
      const { select, where } = this.query(db);
      const row = db.prepare(`${select} WHERE ${where} AND id = ?`).get(id) as unknown as Row | undefined;
      if (!row) return null;
      const timeline = this.readTimeline(row, true);
      const agent = this.summary(row, timeline, this.parentTitles());
      return { agent, activities: timeline.activities, truncated: timeline.truncated, revision: JSON.stringify([agent.revision, agent.parentTitle, agent.task, agent.taskAvailability]) };
    } finally { db.close(); }
  }
}
