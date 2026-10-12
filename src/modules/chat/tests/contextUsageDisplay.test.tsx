import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import '@/modules/i18n';
import TokenUsageSummary from '@/modules/chat/composer/TokenUsageSummary';
import { readContextWindowUsage } from '@/shared/utils';

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
