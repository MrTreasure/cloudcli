import { useCallback, useEffect, useRef } from 'react';

type AdaptivePollingOptions = {
  refresh: (signal: AbortSignal) => Promise<boolean | void>;
  active: boolean;
  enabled?: boolean;
  identity?: string | null;
  activeMs?: number;
  idleMs?: number;
  hiddenMs?: number;
};

/**
 * Used by session activity and chat's queued drafts. Runs one request at a time,
 * schedules from completion, pauses offline, and reconciles on visibility/online.
 * It owns no sockets and never cancels a model turn. No cross-tab state is shared.
 */
export function useAdaptivePolling({ refresh, active, enabled = true, identity,
  activeMs = 5_000, idleMs = 30_000, hiddenMs = 60_000 }: AdaptivePollingOptions) {
  const latest = useRef({ refresh, active, activeMs, idleMs, hiddenMs });
  useEffect(() => {
    latest.current = { refresh, active, activeMs, idleMs, hiddenMs };
  }, [refresh, active, activeMs, idleMs, hiddenMs]);
  const wakeRef = useRef<() => void>(() => {});
  const wake = useCallback(() => wakeRef.current(), []);
  const wasActive = useRef(active);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let inFlight = false;
    let pending = false;
    let failures = 0;
    let authRejected = false;
    let lastStarted = -Infinity;
    let retryAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const normalDelay = (busy = latest.current.active) => document.visibilityState === 'hidden'
      ? latest.current.hiddenMs : busy ? latest.current.activeMs : latest.current.idleMs;
    const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
    const schedule = (delay: number) => {
      clearTimer();
      if (disposed || authRejected || navigator.onLine === false) return;
      timer = setTimeout(() => void run(), delay);
    };
    const run = async () => {
      if (disposed || authRejected || navigator.onLine === false) return;
      if (inFlight) { pending = true; return; }
      clearTimer();
      inFlight = true;
      lastStarted = Date.now();
      let delay = normalDelay();
      try {
        const busy = await latest.current.refresh(controller.signal);
        failures = 0;
        retryAt = 0;
        delay = normalDelay(busy === true || latest.current.active);
      } catch (error) {
        const status = (error as { status?: number } | null)?.status;
        authRejected = status === 401 || status === 403;
        failures += 1;
        // 5/10/20/40/80 seconds with positive jitter, capped at 120 seconds.
        delay = Math.min(120_000, Math.max(normalDelay(), 5_000 * 2 ** Math.min(failures - 1, 5)) * (1 + Math.random() * 0.25));
        retryAt = Date.now() + delay;
      } finally {
        inFlight = false;
        if (pending && !failures) { pending = false; delay = Math.max(1_000 - (Date.now() - lastStarted), 0); }
        else pending = false;
        schedule(delay);
      }
    };
    const wakeNow = () => {
      if (inFlight) { pending = true; return; }
      schedule(Math.max(retryAt - Date.now(), 1_000 - (Date.now() - lastStarted), 0));
    };
    const visible = () => {
      if (document.visibilityState === 'visible') wakeNow();
      else if (!inFlight) schedule(Math.max(normalDelay(), retryAt - Date.now()));
    };
    const online = () => { failures = 0; retryAt = 0; wakeNow(); };
    const offline = () => clearTimer();
    wakeRef.current = wakeNow;
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    void run();
    return () => {
      disposed = true;
      controller.abort();
      clearTimer();
      wakeRef.current = () => {};
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [enabled, identity]);

  useEffect(() => {
    if (active && !wasActive.current) wake();
    wasActive.current = active;
  }, [active, wake]);
  return wake;
}
