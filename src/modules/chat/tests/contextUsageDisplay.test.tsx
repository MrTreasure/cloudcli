import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import '@/modules/i18n';
import TokenUsageSummary from '@/modules/chat/composer/TokenUsageSummary';
import CommandResultModal from '@/modules/chat/modals/CommandResultModal';
import { CodexContextPanel } from '@/modules/chat/modals/CodexContextPanel';
import { api } from '@/shared/api';
import type { ProviderModelActions } from '@/shared/types';
import { formatContextTokenCount, readContextWindowUsage } from '@/shared/utils';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
  // Match the row labels exactly; "Configured model window" is a separate field.
  expect(screen.getByText('Configured')).toBeTruthy();
  expect(screen.getByText('Current')).toBeTruthy();
  expect(screen.queryByText(/摘要|summary/i)).toBeNull();
});



test('request body details separate measured totals, average and maximum from legacy counters', async () => {
  vi.spyOn(api.providers, 'sessionImageContext').mockResolvedValue(new Response(JSON.stringify({ success: true, data: {
    policy: { recentImages: 3, imageBytes: 1048576, pinnedImageIds: [] }, images: [], activeImageIds: [],
    metrics: {
      requests: 100, requestBytesBefore: 16384, requestBytesAfter: 1536, savedBytes: 10000,
      historicalImageCount: 0, historicalImageBytes: 0, prunedImageCount: 0, compactions: 0,
      transport: { requests: 2, totalJsonBytes: 32768, totalWireBytes: 2048, maxWireBytes: 1536,
        lastEncoding: 'zstd', lastJsonBytes: 16384, lastWireBytes: 1536, lastCompressionMs: 1.5, lastStatus: 200 },
    },
  } }), { headers: { 'content-type': 'application/json' } }));
  render(<CodexContextPanel sessionId="session" busy={false} />);
  const latest = await screen.findByText(/Latest body encoding zstd/);
  expect(latest.textContent).toContain('16.0 KiB → 1.5 KiB');
  const totals = screen.getByText(/CloudCLI → upstream cumulative request bodies/);
  expect(totals.textContent).toContain('2.0 KiB (2 requests)');
  expect(totals.textContent).toContain('Average 1.0 KiB');
  expect(totals.textContent).toContain('Maximum 1.5 KiB');
  expect(totals.textContent).toContain('Excludes CPA → ChatGPT');
});
