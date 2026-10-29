import { useEffect, useState } from 'react';
import { Activity, ArrowLeft, Check, ChevronRight, CircleHelp, FileCode2, History, MessageSquare, RefreshCw, Search, Terminal, Trash2, X } from 'lucide-react';

import { useCodexAgents } from '@/modules/codex-agents/context/CodexAgentsContext';
import type { CodexAgentStatus, CodexAgentSummary } from '@/shared/types';

const STATUS: Record<CodexAgentStatus, string> = { running: '运行中', completed: '已完成', stopped: '已停止', failed: '失败', unknown: '待确认' };
const ended = (row: CodexAgentSummary) => ['completed', 'stopped', 'failed'].includes(row.status);
const canHide = (row: CodexAgentSummary) => ['completed', 'stopped', 'failed', 'unknown'].includes(row.status);
const BUTTON = 'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border/70 px-3 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

function relative(at: string | null): string {
  if (!at) return '无活动记录';
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60_000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`;
  return `${Math.floor(minutes / 1440)} 天前`;
}

/** Native plugin host and standalone mount render this compact task inspector using the shared request owner. */
export function CodexAgentsPanel({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const state = useCodexAgents();
  // Search filters the loaded observations locally without triggering network traffic.
  const [query, setQuery] = useState('');
  // History is secondary; live work remains visible by default.
  const [historyOpen, setHistoryOpen] = useState(false);
  // Explicit confirmation makes panel-history clearing distinguishable from stopping work.
  const [clearing, setClearing] = useState<string[] | null>(null);
  // Retain explicit selections across updates, pruning only unavailable or no-longer-matching panel records.
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const setInspecting = state?.setInspecting;
  useEffect(() => { setInspecting?.(true); return () => setInspecting?.(false); }, [setInspecting]);
  useEffect(() => { setClearing(null); setQuery(''); setCheckedIds(new Set()); }, [state?.projectPath, state?.onlyProject]);
  useEffect(() => {
    const needle = query.trim().toLowerCase();
    const valid = new Set((state?.snapshot?.items || []).filter((row) => canHide(row)
      && `${row.name} ${row.task} ${row.model || ''} ${row.parentTitle || ''}`.toLowerCase().includes(needle)).map((row) => row.id));
    setCheckedIds((previous) => {
      const next = new Set([...previous].filter((id) => valid.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [state?.snapshot, query]);
  useEffect(() => { setClearing(null); }, [query]);
  if (!state) return <p className="p-5 text-sm text-muted-foreground">正在连接 subAgent…</p>;
  const { snapshot, detail, selectedId, pending } = state;
  const needle = query.trim().toLowerCase();
  const rows = (snapshot?.items || []).filter((row) => `${row.name} ${row.task} ${row.model || ''} ${row.parentTitle || ''}`.toLowerCase().includes(needle));
  const active = rows.filter((row) => row.status === 'running');
  const uncertain = rows.filter((row) => row.status === 'unknown');
  const history = rows.filter(ended);
  const confirmationRows = (snapshot?.items || []).filter((row) => clearing?.includes(row.id) && canHide(row));
  const confirmClear = async () => {
    if (!confirmationRows.length || confirmationRows.length > 100) return;
    const removed = await state.clearRecords(confirmationRows);
    if (removed === null) return;
    setCheckedIds((previous) => new Set([...previous].filter((id) => !removed.includes(id))));
    setClearing(null);
  };
  const chosen = detail?.agent || rows.find((row) => row.id === selectedId);
  const renderRow = (row: CodexAgentSummary) => <li key={row.id} className="flex min-w-0 items-center border-b border-border/40 last:border-0">
    {canHide(row) && <label className="flex min-h-11 w-11 shrink-0 cursor-pointer items-center justify-center"><input type="checkbox" aria-label={`选择记录：${row.name}`} disabled={pending} checked={checkedIds.has(row.id)} onChange={(event) => {
      setClearing(null);
      const checked = event.target.checked;
      setCheckedIds((previous) => { const next = new Set(previous); if (checked) next.add(row.id); else next.delete(row.id); return next; });
    }} /></label>}
    <button type="button" aria-expanded={selectedId === row.id} onClick={() => state.choose(row.id)}
      className={`group flex min-h-20 w-full min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${selectedId === row.id ? 'bg-accent' : 'hover:bg-muted/50'}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 ${row.status === 'running' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
        {row.status === 'running' ? <Activity size={15} /> : row.status === 'unknown' ? <CircleHelp size={15} /> : <Check size={15} />}
      </span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{row.name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{row.lastActivity || row.task || '暂无活动摘要'}</span>
        <span className="mt-1 block truncate text-[11px] text-muted-foreground">{row.model || '未记录模型'}{row.parentTitle ? ` · ${row.parentTitle}` : ''}</span></span>
      <span className="shrink-0 text-right text-[11px] text-muted-foreground"><span className={row.status === 'running' ? 'text-emerald-700 dark:text-emerald-400' : ''}>{STATUS[row.status]}</span><time className="mt-1 block tabular-nums" dateTime={row.lastActivityAt || row.updatedAt}>{relative(row.lastActivityAt || row.updatedAt)}</time></span>
      <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
    </button>
  </li>;

  const renderSelectionToolbar = (items: CodexAgentSummary[], label: string) => {
    const selectedRows = items.filter((row) => checkedIds.has(row.id));
    const allChecked = items.length > 0 && selectedRows.length === items.length;
    return <div className="px-3 py-2" aria-label={`${label}批量选择`}>
      <div className="flex flex-wrap items-center gap-3"><button type="button" className={BUTTON} disabled={pending || !items.length} onClick={() => {
        setClearing(null);
        setCheckedIds((previous) => { const next = new Set(previous); for (const row of items) { if (allChecked) next.delete(row.id); else next.add(row.id); } return next; });
      }}>{allChecked ? '取消全选' : '全选'}</button><button type="button" className={BUTTON} disabled={pending || !selectedRows.length || selectedRows.length > 100} onClick={() => setClearing(selectedRows.map((row) => row.id))}><Trash2 size={13} />清除所选（{selectedRows.length}）</button></div>
      <p className="mt-2 text-[11px] text-muted-foreground">仅当前已加载且符合搜索的{label}记录 · 每次最多 100 条</p>
      {selectedRows.length > 100 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400" role="status">已选 {selectedRows.length} 条，请取消部分勾选，每次最多清除 100 条。</p>}
    </div>;
  };

  return <section className={`h-full overflow-auto bg-background text-foreground ${theme === 'dark' ? 'dark' : ''}`} aria-label="subAgent">
    {/* finesse: product/AI-console, existing neutral tokens, dense split inspector; feedback-only motion. */}
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-semibold tracking-tight">subAgent</h1><p className="mt-1 text-xs text-muted-foreground">{state.onlyProject ? state.projectPath.split(/[\\/]/).filter(Boolean).at(-1) || '当前项目' : '全部项目'} · 原生执行活动</p></div>
        <button type="button" className={BUTTON} onClick={state.refresh} aria-label="刷新记录"><RefreshCw size={14} /><span>刷新</span></button>
      </header>
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-border/60 pb-4">
        <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-3 text-muted-foreground sm:max-w-80"><Search size={14} className="shrink-0" /><input className="w-full min-w-0 border-0 bg-transparent py-2 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring" aria-label="搜索已加载的子 Agent" placeholder="搜索任务、动作或模型" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="flex min-h-10 items-center gap-2 whitespace-nowrap text-xs text-muted-foreground"><input type="checkbox" checked={state.onlyProject} onChange={(event) => state.setOnlyProject(event.target.checked)} />当前项目</label>
        <span className="ml-auto text-[11px] text-muted-foreground">{snapshot ? `更新于 ${new Date(snapshot.observedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '连接中'}</span>
      </div>
      {state.error && <p className="mb-4 rounded-md border border-amber-600/30 bg-amber-500/5 p-3 text-xs" role="alert">{state.error}</p>}
      {clearing && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3" role="alertdialog" aria-label="清除记录确认"><p className="flex-1 text-sm">从面板移除选中的 {confirmationRows.length} 条记录。仅移出面板，不停止任务；有新活动会恢复显示。</p><button className={BUTTON} disabled={pending || !confirmationRows.length || confirmationRows.length > 100} onClick={() => void confirmClear()}>{pending ? '清除中…' : '确认清除'}</button><button className={BUTTON} disabled={pending} onClick={() => setClearing(null)}>取消</button></div>}
      <div className={`grid min-w-0 gap-6 ${selectedId ? 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]' : 'grid-cols-1'}`}>
        <div className={`min-w-0 ${selectedId ? 'hidden lg:block' : ''}`}>
          <section className="rounded-xl border border-border/60 bg-muted/10"><div className="flex items-center gap-2 border-b border-border/50 px-4 py-3 text-xs font-medium"><Activity size={14} className="text-emerald-700 dark:text-emerald-400" />活动<span className="ml-auto font-mono text-muted-foreground">{active.length}</span></div><ul>{active.map(renderRow)}</ul>
            {!active.length && <p className="px-4 py-7 text-sm text-muted-foreground" role="status">{!snapshot ? '正在读取原生记录…' : !snapshot.available ? '此机器尚未发现 Codex 会话索引。' : '当前没有活动的子 Agent'}</p>}</section>
          {uncertain.length > 0 && <section className="mt-4"><h2 className="mb-2 flex items-center gap-2 px-3 text-xs text-muted-foreground"><CircleHelp size={13} />待确认 · {uncertain.length}</h2>{renderSelectionToolbar(uncertain, '待确认')}<p className="px-3 pb-2 text-[11px] text-muted-foreground">仅移出面板，不停止任务；有新活动会恢复显示。</p><ul>{uncertain.map(renderRow)}</ul></section>}
          <section className="mt-5 border-t border-border/60 pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><button className="flex min-h-10 items-center gap-2 px-3 text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}><History size={14} />已结束 · {history.length}<ChevronRight size={13} className={historyOpen ? 'rotate-90' : ''} /></button>
            </div>
            {historyOpen && <>{renderSelectionToolbar(history, '已结束')}<ul>{history.map(renderRow)}</ul>{!history.length && <p className="px-3 py-4 text-xs text-muted-foreground">没有已结束记录</p>}</>}</section>
          {snapshot?.nextOffset != null && <button type="button" className={`${BUTTON} mt-4`} disabled={pending} onClick={() => void state.loadMore()}>加载更多</button>}
          <p className="mt-5 px-3 text-[11px] leading-relaxed text-muted-foreground">显示已加载记录。活动 5 秒更新，空闲 20 秒更新。长期无新活动标为待确认。<br />清除仅影响面板记录；执行资源由所属 Codex 管理。</p>
        </div>
        {selectedId && <aside className="min-w-0 rounded-xl border border-border/60 bg-muted/10" aria-label="子 Agent 执行详情">
          <div className="flex min-w-0 items-center gap-3 border-b border-border/60 p-4"><button className={`${BUTTON} lg:hidden`} onClick={() => state.choose(null)} aria-label="返回任务列表"><ArrowLeft size={14} /></button><div className="min-w-0 flex-1"><h2 className="truncate text-base font-semibold">{chosen?.name || '执行详情'}</h2><p className="mt-1 text-xs text-muted-foreground">{chosen ? STATUS[chosen.status] : '读取中'}</p></div><button className={BUTTON} onClick={() => state.choose(null)} aria-label="关闭详情"><X size={14} /></button></div>
          {chosen && <div className="space-y-3 border-b border-border/50 p-4"><p className="whitespace-pre-wrap break-words text-sm">{chosen.task || chosen.name}</p><dl className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs"><dt className="text-muted-foreground">父会话</dt><dd className="break-words">{chosen.parentTitle || chosen.parentId || '未记录'}</dd><dt className="text-muted-foreground">模型</dt><dd>{chosen.model || '未记录'}</dd><dt className="text-muted-foreground">项目</dt><dd className="break-all">{chosen.projectPath}</dd></dl>{canHide(chosen) && <button className={BUTTON} disabled={pending} onClick={() => setClearing([chosen.id])}><Trash2 size={13} />清除记录</button>}</div>}
          {!detail ? <p className="p-4 text-xs text-muted-foreground">{state.error ? '暂时无法读取活动，请重试。' : '正在读取活动…'}</p> : <div className="p-4"><p className="mb-3 text-[11px] text-muted-foreground">最近 {detail.activities.length} 条活动{detail.truncated ? ' · 仅展示近期记录' : ''}</p>
            {!detail.activities.length && <p className="py-4 text-xs text-muted-foreground">{detail.agent.recordAvailable ? '暂无执行活动' : '原生执行文件不可用'}</p>}
            <ol className="ml-2 border-l border-border/70">{detail.activities.map((event) => {
              const Icon = event.kind === 'command' ? Terminal : event.kind === 'file' ? FileCode2 : event.kind === 'message' ? MessageSquare : Activity;
              return <li key={event.id} className="relative mb-5 min-w-0 pl-5"><span className="absolute -left-2 top-0.5 bg-background text-muted-foreground"><Icon size={15} /></span><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="min-w-0 break-all font-medium">{event.label}</span><time className="text-[11px] tabular-nums text-muted-foreground" dateTime={event.at}>{new Date(event.at).toLocaleTimeString('zh-CN', { hour12: false })}</time></div>{event.text && (event.kind === 'message' ? <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed">{event.text}</p> : <details className="mt-2 text-xs"><summary className="min-h-8 cursor-pointer text-muted-foreground">查看输出</summary><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border/50 bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">{event.text}</pre></details>)}</li>;
            })}</ol></div>}
        </aside>}
      </div>
    </div>
  </section>;
}
