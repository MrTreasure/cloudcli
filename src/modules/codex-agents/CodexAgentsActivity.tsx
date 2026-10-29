import { Activity, ArrowUpRight, CircleHelp } from 'lucide-react';

import { useCodexAgents } from '@/modules/codex-agents/context/CodexAgentsContext';

/** WorkspaceHeader shows current-project child activity without opening the inspector or creating another timer. */
export function CodexAgentsActivity({ onOpen }: { onOpen: () => void }) {
  const state = useCodexAgents();
  if (!state?.snapshot) return null;
  const project = state.projectPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const rows = state.snapshot.items.filter((row) => {
    const path = row.projectPath.replace(/\\/g, '/').replace(/\/+$/, '');
    return path === project || path.startsWith(`${project}/`);
  });
  const running = rows.filter((row) => row.status === 'running');
  const unknown = rows.filter((row) => row.status === 'unknown');
  if (!running.length && !unknown.length && !state.error) return null;
  return <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 border-t border-border/50 pt-2 text-xs" aria-label="当前项目 subAgent">
    <button type="button" onClick={() => { state.setOnlyProject(true); onOpen(); }} className="flex min-h-9 shrink-0 items-center gap-2 rounded-md px-2 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      <span>subAgent</span><span className="tabular-nums text-muted-foreground">{running.length} 活动{unknown.length ? ` · ${unknown.length} 待确认` : ''}</span><ArrowUpRight className="h-3 w-3" />
    </button>
    {running.slice(0, 3).map((row) => <button key={row.id} type="button" onClick={() => { if (state.onlyProject) state.choose(row.id); state.setOnlyProject(true); onOpen(); }}
      title={row.lastActivity || row.task} className="flex min-h-9 min-w-0 max-w-64 items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
      <span className="max-w-28 truncate font-medium">{row.name}</span><span className="truncate text-muted-foreground">{row.lastActivity || '执行中'}</span>
    </button>)}
    {state.error && <span className="flex items-center gap-1 text-muted-foreground"><CircleHelp className="h-3 w-3" />状态待更新</span>}
  </div>;
}
