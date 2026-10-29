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

/** Plugin RPC server reads only Codex's native index and bounded rollout tails. Tests supply an isolated home. */
export class CodexAgentReader {
  private readonly home: string;
  private readonly cache = new Map<string, { signature: string; value: Timeline }>();

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
      const signature = `${stat.mtimeMs}:${stat.size}`;
      const cached = this.cache.get(key);
      if (cached?.signature === signature) return cached.value;
      const length = Math.min(stat.size, detail ? 1024 * 1024 : 128 * 1024);
      const buffer = Buffer.alloc(length);
      const descriptor = fs.openSync(filename, 'r');
      try { fs.readSync(descriptor, buffer, 0, length, stat.size - length); } finally { fs.closeSync(descriptor); }
      const lines = buffer.toString('utf8').split('\n');
      if (stat.size > length) lines.shift();
      const modern = new Map<string, CodexAgentActivity>();
      const legacy = new Map<string, CodexAgentActivity>();
      let lifecycle: CodexAgentStatus = 'unknown';
      let lastAt: string | null = null;
      const cutoff = row.created_at * 1000 - 1000;
      const add = (target: Map<string, CodexAgentActivity>, activity: CodexAgentActivity) => {
        target.set(activity.id, { ...activity, label: safeText(activity.label, 220), text: safeText(activity.text) });
      };
      for (const line of lines) {
        const record = parse(line);
        const payload = object(record.payload);
        const at = string(record.timestamp);
        if (!at || !Number.isFinite(Date.parse(at)) || Date.parse(at) < cutoff) continue;
        // Forks can retain parent history; only native events belonging to this child are admissible.
        if (payload.thread_id && payload.thread_id !== row.id) continue;
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
      const activities = [...(modern.size ? modern : legacy).values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const latestActivity = activities.at(-1)?.at;
      if (latestActivity && lifecycle === 'unknown') lifecycle = 'running';
      if (latestActivity && (!lastAt || Date.parse(latestActivity) > Date.parse(lastAt))) lastAt = latestActivity;
      const value: Timeline = { available: true, revision: signature, activities: activities.slice(detail ? -80 : -3), lifecycle, at: lastAt, truncated: stat.size > length || activities.length > (detail ? 80 : 3) };
      this.cache.set(key, { signature, value });
      if (this.cache.size > 400) this.cache.delete(this.cache.keys().next().value!);
      return value;
    } catch { return fallback; }
  }

  private summary(db: DatabaseSync, row: Row, timeline: Timeline): CodexAgentSummary {
    const spawn = object(object(parse(row.source).subagent).thread_spawn);
    const parentId = string(spawn.parent_thread_id) || null;
    const parent = parentId ? db.prepare('SELECT title FROM threads WHERE id = ?').get(parentId) as { title: string } | undefined : undefined;
    let status = timeline.lifecycle;
    // Lack of a completion marker alone is not proof of a live process after a restart.
    if (status === 'running' && (!timeline.at || Date.now() - Date.parse(timeline.at) > 120_000)) status = 'unknown';
    const name = row.name || row.agent_path?.split('/').filter(Boolean).at(-1) || row.agent_nickname || row.title || row.id;
    const latest = timeline.activities.at(-1);
    return {
      id: row.id, parentId, parentTitle: parent ? safeText(parent.title, 160) : null,
      name: safeText(name, 160), nickname: row.agent_nickname, model: row.model,
      task: safeText(row.title, 320), projectPath: row.cwd,
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
      return { available: true, items: rows.slice(0, limit).map((row) => this.summary(db, row, this.readTimeline(row, false))), nextOffset: rows.length > limit ? offset + limit : null, observedAt: new Date().toISOString() };
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
      const agent = this.summary(db, row, timeline);
      return { agent, activities: timeline.activities, truncated: timeline.truncated, revision: `${row.updated_at}:${timeline.revision}:${agent.status}` };
    } finally { db.close(); }
  }
}
