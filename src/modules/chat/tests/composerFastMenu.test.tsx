import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import ComposerModelMenu from '@/modules/chat/composer/ComposerModelMenu';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }) }));

const props = {
  effort: 'medium', effortOptions: [{ value: 'medium' }], onSelectEffort: vi.fn(),
  model: 'gpt-6.1-sol', modelOptions: [{ value: 'gpt-6.1-sol', label: 'GPT-6.1 Sol' }],
  onSelectModel: vi.fn(), modelsLoading: false,
};

test('model menu exposes the same controlled Fast intent and keeps reasoning/model controls', () => {
  const select = vi.fn();
  const view = render(<ComposerModelMenu {...props} codexFast={false} onSelectCodexFast={select} />);
  fireEvent.click(screen.getByRole('button', { name: 'Select model and reasoning effort' }));
  const fast = screen.getByRole('menuitemcheckbox', { name: /Request Fast/ });
  expect(fast.getAttribute('aria-checked')).toBe('false');
  expect(screen.getByRole('menuitemradio', { name: 'medium' })).toBeTruthy();
  expect(screen.getByRole('menuitem', { name: 'GPT-6.1 Sol' })).toBeTruthy();
  fireEvent.click(fast);
  expect(select).toHaveBeenCalledWith(true);
  expect(props.onSelectEffort).not.toHaveBeenCalled();
  view.rerender(<ComposerModelMenu {...props} codexFast onSelectCodexFast={select} codexFastBusy />);
  expect(fast.getAttribute('aria-checked')).toBe('true');
  expect((fast as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<ComposerModelMenu {...props} />);
  expect(screen.queryByRole('menuitemcheckbox')).toBeNull();
});
