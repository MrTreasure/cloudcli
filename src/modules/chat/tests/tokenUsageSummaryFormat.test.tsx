import assert from 'node:assert/strict';

import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

import TokenUsageSummary from '@/modules/chat/composer/TokenUsageSummary';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const shownCount = (used: number) => {
  const { getByRole, unmount } = render(<TokenUsageSummary usage={{ used, total: 1_000_000 }} />);
  const text = getByRole('button').textContent;
  unmount();
  return text?.replace('chat:misc.tokensLabel', '');
};

describe('TokenUsageSummary retained percentage', () => {
  it('shows context occupancy with one decimal and keeps counts in the detail panel', () => {
    assert.equal(shownCount(9_949), '1%');
    assert.equal(shownCount(376_000), '37.6%');
    assert.equal(shownCount(999_600), '100%');
  });
});
