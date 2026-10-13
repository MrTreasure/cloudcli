import assert from 'node:assert/strict';

import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, test } from 'vitest';

import { i18n } from '@/modules/i18n';
import { normalizedToChatMessages } from '@/modules/chat/hooks/useChatMessages';
import MessageComponent from '@/modules/chat/transcript/MessageComponent';
import { formatAnsweringModelLabel } from '@/modules/chat/utils/modelLabel';
import { UiPreferencesProvider } from '@/shared/context/UiPreferencesContext';
import type { ChatMessage, NormalizedMessage } from '@/shared/types';

// The model ids that actually appear on assistant rows in real Claude Code
// transcripts, taken from a ~86k-row sample of this machine's `~/.claude`.
describe('the label a reported model is shortened to', () => {
  it('names the family for a dated or undated id', () => {
    expect(formatAnsweringModelLabel('claude-opus-5')).toBe('Opus');
    expect(formatAnsweringModelLabel('claude-sonnet-5')).toBe('Sonnet');
    expect(formatAnsweringModelLabel('claude-haiku-4-5-20251001')).toBe('Haiku');
    expect(formatAnsweringModelLabel('claude-fable-5-1')).toBe('Fable');
    expect(formatAnsweringModelLabel('opus')).toBe('Opus');
  });

  it('keeps a 1M-context id distinct from the base model if one is ever reported', () => {
    // Claude Code writes the base id on assistant rows today, so this guards
    // the mapping rather than describing current transcripts: the same family
    // at a different context window and price must not read as the base.
    expect(formatAnsweringModelLabel('claude-opus-5[1m]')).toBe('Opus 1M');
    expect(formatAnsweringModelLabel('claude-opus-5')).toBe('Opus');
  });

  it('shows an unrecognized id verbatim rather than dropping it', () => {
    expect(formatAnsweringModelLabel('grok-4.6')).toBe('grok-4.6');
  });

  it('has nothing to show when the provider reported no model', () => {
    expect(formatAnsweringModelLabel(undefined)).toBeNull();
    expect(formatAnsweringModelLabel('   ')).toBeNull();
  });
});

const normalized = (overrides: Partial<NormalizedMessage>): NormalizedMessage => ({
  id: 'row-1',
  sessionId: 'session-1',
  timestamp: '2026-08-19T12:00:00.000Z',
  provider: 'claude',
  kind: 'text',
  role: 'assistant',
  content: 'Here is the plan.',
  ...overrides,
});

test('the model the backend reported survives the conversion into a rendered message', () => {
  const [reply] = normalizedToChatMessages([normalized({ model: 'claude-opus-5' })]);
  assert.equal(reply?.model, 'claude-opus-5');

  // A reply the provider named no model for must not inherit one.
  const [unlabelled] = normalizedToChatMessages([normalized({ id: 'row-2', model: undefined })]);
  assert.equal(unlabelled?.model, undefined);
});

const renderMessage = (message: ChatMessage) =>
  render(
    <UiPreferencesProvider>
      <MessageComponent message={message} prevMessage={null} createDiff={() => []} provider="claude" />
    </UiPreferencesProvider>,
  );

// Exercise both languages so absence assertions cannot pass merely because an
// English selector missed an existing Chinese model label.
for (const [language, answeredByPattern, answeredBy] of [
  ['en', /^Answered by /, 'Answered by claude-opus-5'],
  ['zh-CN', /^由 .+ 回答$/, '由 claude-opus-5 回答'],
] as const) {
  describe(`${language} model label in the message footer`, () => {
    it('names the model that answered, beside the copy control', async () => {
      await i18n.changeLanguage(language);
      const view = renderMessage({
        type: 'assistant',
        content: 'Here is the plan.',
        timestamp: '2026-08-19T12:00:00.000Z',
        model: 'claude-opus-5',
      });

      const label = view.getByLabelText(answeredBy);
      assert.equal(label.getAttribute('title'), answeredBy);
      assert.equal(label.textContent, 'Opus');
    });

    it('shows nothing for a reply the provider reported no model for', async () => {
      await i18n.changeLanguage(language);
      // Local usage-limit notices must not inherit a guessed model.
      const view = renderMessage({
        type: 'assistant',
        content: 'Claude usage limit reached.',
        timestamp: '2026-08-19T12:00:00.000Z',
      });

      assert.equal(view.queryByLabelText(answeredByPattern), null);
    });

    it('leaves the user turn unlabelled even when its row carries a model', async () => {
      await i18n.changeLanguage(language);
      const view = renderMessage({
        type: 'user',
        content: 'Plan the refactor.',
        timestamp: '2026-08-19T12:00:00.000Z',
        model: 'claude-opus-5',
      });

      assert.equal(view.queryByLabelText(answeredByPattern), null);
    });
  });
}
