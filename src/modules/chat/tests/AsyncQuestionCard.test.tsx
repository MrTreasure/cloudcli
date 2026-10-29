import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { i18n } from '@/modules/i18n';
import { AsyncQuestionCard } from '@/modules/chat/transcript/AsyncQuestionCard';
import { TranscriptSessionContext } from '@/modules/chat/context/TranscriptSessionContext';
import { useSessionStore } from '@/modules/chat/hooks/useSessionStore';
import { normalizedToChatMessages } from '@/modules/chat/hooks/useChatMessages';
import type { NormalizedMessage } from '@/shared/types';

const questions = [{ title: 'When to restart?', options: ['Wait', 'Now'] }];
await i18n.changeLanguage('en');

test('native choices require an explicit selection and submit only once', async () => {
  let finish!: (accepted: boolean) => void;
  const answerQuestion = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
  render(<TranscriptSessionContext.Provider value={{ sessionId: 's1', answerQuestion }}><AsyncQuestionCard questions={questions} /></TranscriptSessionContext.Provider>);
  const submit = screen.getByRole('button', { name: 'Send answer' });
  expect((submit as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: 'Wait' }));
  fireEvent.click(submit);
  fireEvent.click(submit);
  expect(answerQuestion).toHaveBeenCalledExactlyOnceWith('When to restart?\nWait', expect.any(String));
  await act(async () => finish(true));
  expect(screen.getByRole('status').textContent).toBe('Question closed');
});

test('free-text answers remain retryable when the regular send path refuses them', async () => {
  const answerQuestion = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<TranscriptSessionContext.Provider value={{ sessionId: 's1', answerQuestion }}><AsyncQuestionCard questions={[{ title: 'Details?' }]} /></TranscriptSessionContext.Provider>);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My answer' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send answer' })));
  expect(screen.getByRole('alert')).toBeTruthy();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send answer' })));
  expect(answerQuestion).toHaveBeenLastCalledWith('Details?\nMy answer', expect.any(String));
  expect(answerQuestion.mock.calls[0][1]).toBe(answerQuestion.mock.calls[1][1]);
});

test('history retains structured questions and closes old cards after a user follow-up', () => {
  const question = { id: 'q1', sessionId: 's1', provider: 'codex', timestamp: '2026-10-27T10:00:00Z', kind: 'text', role: 'assistant', content: 'Choose', asyncQuestions: questions } as NormalizedMessage;
  expect(normalizedToChatMessages([question])[0].asyncQuestionAnswered).toBe(false);
  const user = { ...question, id: 'u1', role: 'user', content: 'Wait', asyncQuestions: undefined } as NormalizedMessage;
  const converted = normalizedToChatMessages([question, user]);
  expect(converted[0].asyncQuestions).toEqual(questions);
  expect(converted[0].asyncQuestionAnswered).toBe(true);
  render(<AsyncQuestionCard questions={questions} answered />);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByRole('radio', { name: 'Now' }).matches(':disabled')).toBe(true);
});


test('a finalized text echo cannot hide the native choice metadata arriving next', () => {
  const { result } = renderHook(() => useSessionStore());
  const text = { id: 'stream-final', sessionId: 's1', provider: 'codex', timestamp: '2026-10-27T10:00:00Z', kind: 'text', role: 'assistant', content: 'Choose' } as NormalizedMessage;
  act(() => {
    result.current.appendRealtime('s1', text);
    result.current.appendRealtime('s1', { ...text, id: 'native-question', asyncQuestions: questions });
  });
  expect(result.current.getMessages('s1')).toHaveLength(1);
  expect(result.current.getMessages('s1')[0].asyncQuestions).toEqual(questions);
});
