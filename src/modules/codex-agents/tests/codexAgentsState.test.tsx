import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { CodexAgentsProvider, useCodexAgents } from '@/modules/codex-agents/context/CodexAgentsContext';
import type { CodexAgentSummary, PluginHostApi } from '@/shared/types';

const row: CodexAgentSummary = { id: 'child', parentId: 'parent', parentTitle: 'Main', name: 'Worker', nickname: null, model: 'mock', task: 'Test', projectPath: '/repo', createdAt: '2026-10-29T00:00:00Z', updatedAt: '2026-10-29T00:00:01Z', status: 'completed', lastActivity: 'Done', lastActivityAt: '2026-10-29T00:00:01Z', recordAvailable: true, revision: '1' };
function Probe({ name }: { name: string }) {
  const state = useCodexAgents()!;
  return <><p>{name}:{state.snapshot?.items.length ?? 'loading'}</p><button onClick={() => void state.clearRecords(state.snapshot?.items || [])}>clear-{name}</button></>;
}
const host = (rpc: PluginHostApi['rpc']) => ({ context: { theme: 'dark', project: { name: 'repo', path: '/repo' }, session: null }, onContextChange: () => () => {}, getWebSocketUrl: () => '', rpc }) as PluginHostApi;

test('header and inspector share a single initial query and clear updates both consumers', async () => {
  let cleared = false;
  const rpc = vi.fn(async (method: string, path: string) => {
    if (method === 'POST') { cleared = true; return { cleared: ['child'] }; }
    expect(path).toContain('project=%2Frepo');
    return { available: true, items: cleared ? [] : [row], nextOffset: null, observedAt: '2026-10-29T00:00:00Z' };
  });
  render(<CodexAgentsProvider projectPath="/repo" pluginApi={host(rpc)}><Probe name="header" /><Probe name="panel" /></CodexAgentsProvider>);
  await screen.findByText('header:1'); expect(screen.getByText('panel:1')).toBeTruthy(); expect(rpc).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('clear-panel'));
  await screen.findByText('header:0'); expect(screen.getByText('panel:0')).toBeTruthy();
  expect(rpc).toHaveBeenCalledWith('POST', '/agents/clear', { records: [{ id: 'child', revision: '1' }] });
});

test('disabled plugin never requests data and enabling discovers project work', async () => {
  const rpc = vi.fn(async () => ({ available: true, items: [row], nextOffset: null, observedAt: '2026-10-29T00:00:00Z' }));
  const pluginApi = host(rpc);
  const view = render(<CodexAgentsProvider projectPath="/repo" enabled={false} pluginApi={pluginApi}><Probe name="header" /></CodexAgentsProvider>);
  await act(async () => {}); expect(rpc).not.toHaveBeenCalled();
  view.rerender(<CodexAgentsProvider projectPath="/repo" enabled pluginApi={pluginApi}><Probe name="header" /></CodexAgentsProvider>);
  await waitFor(() => expect(screen.getByText('header:1')).toBeTruthy()); expect(rpc).toHaveBeenCalledTimes(1);
});
