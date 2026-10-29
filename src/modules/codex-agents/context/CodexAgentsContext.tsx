import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { api as hostApi, readApiErrorMessage } from '@/shared/api';
import { useAdaptivePolling } from '@/shared/hooks/useAdaptivePolling';
import type { CodexAgentDetail, CodexAgentSummary, CodexAgentsSnapshot, PluginHostApi } from '@/shared/types';

type AgentState = {
  snapshot: CodexAgentsSnapshot | null; detail: CodexAgentDetail | null; error: string;
  projectPath: string; onlyProject: boolean; selectedId: string | null; pending: boolean;
  setOnlyProject: (value: boolean) => void; choose: (id: string | null) => void;
  setInspecting: (value: boolean) => void; refresh: () => void; loadMore: () => Promise<void>;
  clearRecords: (rows: CodexAgentSummary[]) => Promise<string[] | null>;
};
const Context = createContext<AgentState | null>(null);

/** Native workspace header and plugin panel consume the same project-scoped state and request scheduler. */
export function useCodexAgents() { return useContext(Context); }

/** WorkspaceMain owns this provider; standalone plugin mounts use the same owner inside their root. */
export function CodexAgentsProvider({ children, projectPath, enabled = true, identity = '', pluginApi }: {
  children: ReactNode; projectPath: string; enabled?: boolean; identity?: string; pluginApi?: PluginHostApi;
}) {
  // Preserve last real observations while a transient network error is displayed.
  const [snapshot, setSnapshot] = useState<CodexAgentsSnapshot | null>(null);
  // All-project browsing is explicit; current project is the default everywhere.
  const [onlyProject, setOnlyProject] = useState(true);
  // Selection and detail belong to one inspector, shared with the compact header.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CodexAgentDetail | null>(null);
  // Avoid fetching transcript details while the inspector is closed.
  const [inspecting, setInspecting] = useState(false);
  // Failed updates never fabricate empty or completed state.
  const [error, setError] = useState('');
  // A single mutation guard prevents repeated clears and pagination clicks.
  const [pending, setPending] = useState(false);
  const pageCount = useRef(1);
  const mutation = useRef(false);
  const readEpoch = useRef(0);
  const paging = useRef(false);
  const currentDetail = useRef(detail);
  useEffect(() => { currentDetail.current = detail; }, [detail]);
  const scope = onlyProject ? projectPath : '';
  const key = `${identity}:${scope}`;
  const currentKey = useRef(key);
  useEffect(() => { currentKey.current = key; }, [key]);
  const rpc = useCallback(async (method: string, path: string, body?: unknown) => {
    if (pluginApi) return pluginApi.rpc(method, path, body);
    const response = await hostApi.plugins.rpc('codex-agents', method, path, body);
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(readApiErrorMessage(data) || '请求失败'), { status: response.status });
    return data;
  }, [pluginApi]);

  useEffect(() => {
    pageCount.current = 1; setSnapshot(null); setSelectedId(null); setDetail(null); setError('');
  }, [key, enabled]);
  const refresh = useCallback(async (signal: AbortSignal) => {
    const epoch = readEpoch.current;
    try {
      const pages: CodexAgentsSnapshot[] = [];
      let offset: number | null = 0;
      for (let index = 0; index < pageCount.current && offset !== null; index++) {
        const query = new URLSearchParams({ project: scope, offset: String(offset) });
        if (index === 0 && inspecting && selectedId) {
          query.set('selected', selectedId);
          if (currentDetail.current?.agent.id === selectedId) query.set('revision', currentDetail.current.revision);
        }
        const page = await rpc('GET', `/agents?${query}`) as CodexAgentsSnapshot;
        if (signal.aborted || currentKey.current !== key || readEpoch.current !== epoch) return;
        pages.push(page); offset = page.nextOffset;
      }
      const first = pages[0];
      if (!first) return;
      // Replace fetched pages so records removed elsewhere cannot survive a merge.
      const items = [...new Map(pages.flatMap((page) => page.items).map((row) => [row.id, row])).values()];
      setSnapshot({ ...first, items, nextOffset: offset }); setError('');
      const result = first.selectedDetail;
      if (inspecting && selectedId && result && !('notModified' in result)) setDetail(result);
      if (inspecting && selectedId && result === null) { setDetail(null); setError('原生记录暂不可用。'); }
      return items.some((row) => row.status === 'running');
    } catch (failure) {
      if (!signal.aborted && currentKey.current === key) setError('更新失败，已保留上次记录。');
      throw failure;
    } finally { paging.current = false; }
  }, [key, rpc, scope, selectedId, inspecting]);
  const wake = useAdaptivePolling({ refresh, active: snapshot?.items.some((row) => row.status === 'running') || false,
    enabled: enabled && Boolean(projectPath), identity: key, activeMs: 5000, idleMs: 20_000, hiddenMs: 60_000 });
  useEffect(() => { if (inspecting && selectedId) wake(); }, [inspecting, selectedId, wake]);
  const choose = useCallback((id: string | null) => { setSelectedId(id); setDetail(null); }, []);
  const loadMore = async () => {
    if (mutation.current || paging.current || snapshot?.nextOffset == null) return;
    paging.current = true; pageCount.current++; wake();
  };
  const clearRecords = async (rows: CodexAgentSummary[]) => {
    if (mutation.current || !rows.length || rows.length > 100) return null;
    const requestKey = key;
    mutation.current = true; readEpoch.current++; setPending(true);
    try {
      const result = await rpc('POST', '/agents/clear', { records: rows.map((row) => ({ id: row.id, revision: row.revision })) }) as { cleared: string[] };
      if (currentKey.current !== requestKey) return null;
      readEpoch.current++;
      const removed = new Set(result.cleared);
      setSnapshot((previous) => previous ? { ...previous, items: previous.items.filter((row) => !removed.has(row.id)) } : previous);
      if (selectedId && removed.has(selectedId)) choose(null);
      setError(''); wake();
      return result.cleared;
    } catch (failure) {
      if (currentKey.current === requestKey) setError(failure instanceof Error ? failure.message : '清除失败，请重试。');
      return null;
    } finally { mutation.current = false; setPending(false); }
  };
  const value = { snapshot, detail, error, projectPath, onlyProject, selectedId, pending,
    setOnlyProject, choose, setInspecting, refresh: wake, loadMore, clearRecords };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
