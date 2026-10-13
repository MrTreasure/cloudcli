import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import '@/modules/i18n';
import TokenUsageSummary from '@/modules/chat/composer/TokenUsageSummary';
import CommandResultModal from '@/modules/chat/modals/CommandResultModal';
import type { ProviderModelActions } from '@/shared/types';
import { formatContextTokenCount, readContextWindowUsage } from '@/shared/utils';

afterEach(cleanup);

test('summary shows current context percentage and preserves click access to details', () => {
  render(<TokenUsageSummary usage={{ used: 75000, total: 200000 }} />);
  expect(screen.getByText('37.5%')).toBeTruthy();
  expect(screen.getByRole('button')).toBeTruthy();
});

test('missing provider usage is unknown rather than zero', () => {
  render(<TokenUsageSummary usage={null} />);
  expect(screen.getByText('—')).toBeTruthy();
  expect(readContextWindowUsage(null).percentage).toBeNull();
});

test('full and over-limit windows retain their actual occupancy', () => {
  expect(readContextWindowUsage({ used: 200000, total: 200000 }).percentage).toBe(100);
  expect(readContextWindowUsage({ used: 220000, total: 200000 }).percentage).toBe(110);
  expect(readContextWindowUsage({ used: 0, total: 200000 }).percentage).toBe(0);
  expect(readContextWindowUsage({ used: 120, total: 0 }).percentage).toBeNull();
});


test('context details use K abbreviations for the reported screenshot values', () => {
  expect(formatContextTokenCount(171341)).toBe('171.3K');
  expect(formatContextTokenCount(258400)).toBe('258.4K');
  expect(formatContextTokenCount(182)).toBe('182');
  expect(readContextWindowUsage({ used: 171341, total: 258400 }).percentage).toBe(66.3);
});

test('Codex details mark the real automatic compaction threshold on the usage bar', () => {
  render(<CommandResultModal
    payload={{ kind: 'cost', data: {
      provider: 'codex', model: 'gpt-6.1-sol',
      tokenUsage: { used: 243200, total: 486400, configuredContextWindow: 512000, autoCompactThreshold: 460800 },
    } }}
    onClose={() => undefined}
    providerModelCatalog={{}}
    providerModelActions={{} as ProviderModelActions}
    activeProvider="codex"
    activeProviderModel="gpt-6.1-sol"
    currentSessionId="session"
    canCompactContext={true}
    onCompactContext={() => undefined}
    onSelectProviderModel={async () => ({ scope: 'session', model: 'gpt-6.1-sol' })}
  />);
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
  expect(screen.getByText('94.7% · 460.8K')).toBeTruthy();
  expect(screen.getByText(/misc\.configuredValues|设定值|Configured/)).toBeTruthy();
  expect(screen.getByText(/misc\.actualValues|当前值|Current/)).toBeTruthy();
  expect(screen.queryByText(/摘要|summary/i)).toBeNull();
});

test.each(['codex', 'claude'] as const)('the %s token modal closes and starts native context compaction', (provider) => {
  const onClose = vi.fn();
  const onCompact = vi.fn();
  const props = {
    payload: { kind: 'cost' as const, data: { provider, tokenUsage: { used: 1000, total: 200000 } } },
    onClose,
    providerModelCatalog: {},
    providerModelActions: {} as ProviderModelActions,
    activeProvider: provider,
    activeProviderModel: 'test-model',
    currentSessionId: 'session',
    canCompactContext: true,
    onCompactContext: onCompact,
    onSelectProviderModel: async () => ({ scope: 'session' as const, model: 'test-model' }),
  };
  const view = render(<CommandResultModal {...props} />);
  const button = screen.getByRole('button', { name: /压缩上下文|Compact context/ });
  fireEvent.click(button);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onCompact).toHaveBeenCalledTimes(1);
  expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onCompact.mock.invocationCallOrder[0]);

  view.rerender(<CommandResultModal {...props} canCompactContext={false} />);
  expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(button);
  expect(onCompact).toHaveBeenCalledTimes(1);
});
