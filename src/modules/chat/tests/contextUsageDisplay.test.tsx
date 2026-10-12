import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
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
    onSelectProviderModel={async () => ({ scope: 'session', model: 'gpt-6.1-sol' })}
  />);
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
  expect(screen.getByText('94.7% · 460.8K')).toBeTruthy();
  expect(screen.getByText(/misc\.configuredValues|设定值|Configured/)).toBeTruthy();
  expect(screen.getByText(/misc\.actualValues|当前值|Current/)).toBeTruthy();
  expect(screen.queryByText(/摘要|summary/i)).toBeNull();
});
