import assert from 'node:assert/strict';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, test, vi } from 'vitest';

import { AskUserQuestionPanel } from '@/modules/chat/tools/InteractiveRenderers/AskUserQuestionPanel';

afterEach(cleanup);

test('Codex native question options submit through the existing permission decision', () => {
  const onDecision = vi.fn();
  const input = { questions: [{ id: 'scope', question: '如何处理？', options: [
    { label: '保留, 并修复', description: '继续处理' }, { label: '暂缓', description: '稍后处理' },
  ] }] };
  render(<AskUserQuestionPanel request={{ requestId: 'native-q', provider: 'codex', toolName: 'AskUserQuestion', input }} onDecision={onDecision} />);
  assert.ok(screen.getByText('Codex needs your input'));
  fireEvent.click(screen.getByText('保留, 并修复'));
  fireEvent.click(screen.getByText('Submit'));
  assert.deepEqual(onDecision.mock.calls, [['native-q', { allow: true,
    updatedInput: { ...input, answers: { '如何处理？': '保留, 并修复' } },
  }]]);
});

test('a native free-text question accepts an answer without predefined options', () => {
  const onDecision = vi.fn();
  const input = { questions: [{ question: '补充说明？', options: [] }] };
  render(<AskUserQuestionPanel request={{ requestId: 'native-text', provider: 'codex', toolName: 'AskUserQuestion', input }} onDecision={onDecision} />);
  fireEvent.click(screen.getByText('Other...'));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '我的说明' } });
  fireEvent.click(screen.getByText('Submit'));
  assert.deepEqual(onDecision.mock.calls[0], ['native-text', { allow: true,
    updatedInput: { ...input, answers: { '补充说明？': '我的说明' } },
  }]);
});
