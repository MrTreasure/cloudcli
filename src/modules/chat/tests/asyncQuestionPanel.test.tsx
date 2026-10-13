import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import '@/modules/i18n';
import PermissionContext from '@/modules/chat/context/PermissionContext';
import { AsyncQuestionPanel } from '@/modules/chat/tools/InteractiveRenderers/AsyncQuestionPanel';

test('async confirmation renders choices and sends exactly one selected answer', async () => {
  let resolve: () => void = () => undefined;
  const submitted = new Promise<void>((done) => { resolve = done; });
  const answer = vi.fn(() => submitted);
  const questions = [{ question: 'Which commands?', options: [{ label: '/ commands', description: '' }, { label: 'Toolbar buttons', description: '' }] }];
  render(<PermissionContext.Provider value={{ pendingPermissionRequests: [], handlePermissionDecision: () => undefined, answerAsyncQuestion: answer }}>
    <AsyncQuestionPanel questions={questions} questionId="question-1" />
  </PermissionContext.Provider>);
  const submit = screen.getByRole('button', { name: /Submit|提交/ });
  expect((submit as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByText('/ commands').closest('button')!);
  fireEvent.click(submit);
  fireEvent.click(submit);
  expect(answer).toHaveBeenCalledTimes(1);
  expect(answer).toHaveBeenCalledWith(questions, { 'Which commands?': '/ commands' });
  await act(async () => resolve());
  await waitFor(() => expect(screen.queryByRole('button', { name: /Submit|提交/ })).toBeNull());
});
