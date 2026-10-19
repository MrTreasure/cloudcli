import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/shared/api';

type FastSelection = { enabled: boolean; status: 'ready' | 'loading' | 'saving' | 'error'; error?: string };
type FastResponse = { success?: boolean; data?: { sessionId?: string; codexFast?: boolean } };

/** ChatInterface uses session-scoped Fast intent; drafts never become a provider-wide default. */
export function useCodexFastState(sessionId: string | null, draftScope: string, isCodex: boolean) {
  const scope = sessionId ? `session:${sessionId}` : `draft:${draftScope}`;
  // Keep each session's loaded/optimistic value separate so navigation cannot
  // render the previous session's Fast choice while a request is in flight.
  const [selections, setSelections] = useState<Record<string, FastSelection>>({});
  // Allows an explicit retry after an authenticated metadata request fails.
  const [retry, setRetry] = useState(0);
  const versions = useRef(new Map<string, number>());
  // A session reopened during a write must read after that write finishes.
  const pendingWrites = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    if (!isCodex || !sessionId) return;
    let cancelled = false;
    const version = (versions.current.get(scope) ?? 0) + 1;
    versions.current.set(scope, version);
    setSelections((previous) => ({ ...previous, [scope]: { enabled: previous[scope]?.enabled ?? false, status: 'loading' } }));
    void (async () => {
      try {
        await pendingWrites.current.get(scope);
        if (cancelled || versions.current.get(scope) !== version) return;
        const response = await api.providers.sessionCodexFast(sessionId);
        const body = await response.json() as FastResponse;
        if (!response.ok || !body.success || body.data?.sessionId !== sessionId || typeof body.data.codexFast !== 'boolean') {
          throw new Error('Failed to load this session’s Fast setting.');
        }
        if (!cancelled && versions.current.get(scope) === version) {
          setSelections((previous) => ({ ...previous, [scope]: { enabled: body.data!.codexFast!, status: 'ready' } }));
        }
      } catch (error) {
        if (!cancelled && versions.current.get(scope) === version) {
          setSelections((previous) => ({ ...previous, [scope]: {
            enabled: previous[scope]?.enabled ?? false, status: 'error', error: String(error),
          } }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, scope, isCodex, retry]);

  const selection = selections[scope] ?? { enabled: false, status: sessionId ? 'loading' : 'ready' };
  const selectFast = useCallback(async (enabled: boolean) => {
    if (!isCodex) return;
    if (selection.status === 'error') { setRetry((previous) => previous + 1); return; }
    if (selection.status !== 'ready') return;
    if (!sessionId) {
      setSelections((previous) => ({ ...previous, [scope]: { enabled, status: 'ready' } }));
      return;
    }
    const previousValue = selection.enabled;
    const version = (versions.current.get(scope) ?? 0) + 1;
    versions.current.set(scope, version);
    setSelections((previous) => ({ ...previous, [scope]: { enabled, status: 'saving' } }));
    const write = (async () => {
      try {
        const response = await api.providers.setSessionCodexFast(sessionId, enabled);
        const body = await response.json() as FastResponse;
        if (!response.ok || !body.success || body.data?.sessionId !== sessionId || body.data.codexFast !== enabled) {
          throw new Error('Failed to save this session’s Fast setting.');
        }
        if (versions.current.get(scope) === version) {
          setSelections((previous) => ({ ...previous, [scope]: { enabled, status: 'ready' } }));
        }
      } catch (error) {
        if (versions.current.get(scope) === version) {
          setSelections((previous) => ({ ...previous, [scope]: { enabled: previousValue, status: 'error', error: String(error) } }));
        }
      }
    })();
    pendingWrites.current.set(scope, write);
    await write;
    if (pendingWrites.current.get(scope) === write) pendingWrites.current.delete(scope);
  }, [isCodex, sessionId, scope, selection.enabled, selection.status]);

  // The session-creation HTTP response confirms this value was persisted.
  // Reset the draft immediately so the next new conversation starts off.
  const bindDraft = useCallback((newSessionId: string, enabled: boolean) => {
    setSelections((previous) => ({ ...previous,
      [`session:${newSessionId}`]: { enabled, status: 'ready' },
      [scope]: { enabled: false, status: 'ready' },
    }));
  }, [scope]);

  return {
    codexFast: isCodex && selection.enabled,
    codexFastReady: !isCodex || selection.status === 'ready',
    codexFastBusy: selection.status === 'loading' || selection.status === 'saving',
    codexFastError: isCodex ? selection.error ?? null : null,
    selectCodexFast: selectFast,
    bindCodexFastDraft: bindDraft,
  };
}
