import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

import { CodexAgentsPanel } from '@/modules/codex-agents/CodexAgentsPanel';
import { CodexAgentsProvider } from '@/modules/codex-agents/context/CodexAgentsContext';
import type { PluginHostApi } from '@/shared/types';

const roots = new WeakMap<HTMLElement, { root: Root; host: HTMLElement }>();

function StandalonePanel({ api }: { api: PluginHostApi }) {
  // Standalone hosts deliver theme and project updates independently of this React root.
  const [context, setContext] = useState(api.context);
  useEffect(() => api.onContextChange(setContext), [api]);
  return <CodexAgentsProvider projectPath={context.project?.path || ''} pluginApi={api}>
    <CodexAgentsPanel theme={context.theme} />
  </CodexAgentsProvider>;
}

/** Native plugin host and standalone bundle mount the same UI; Vite publishes its assets to the configured CDN. */
export function mount(container: HTMLElement, api: PluginHostApi): void {
  unmount(container);
  const host = document.createElement('div');
  host.style.height = '100%';
  container.append(host);
  const root = createRoot(host);
  roots.set(container, { root, host });
  root.render(<StandalonePanel api={api} />);
}

/** Plugin host calls this on tab exit; defer nested-root cleanup beyond the parent React commit. */
export function unmount(container: HTMLElement): void {
  const mounted = roots.get(container);
  if (!mounted) return;
  roots.delete(container);
  queueMicrotask(() => { mounted.root.unmount(); mounted.host.remove(); });
}
