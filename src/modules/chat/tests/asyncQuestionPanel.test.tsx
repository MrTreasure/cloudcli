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

test('a free-text question opens its input directly and Enter only sends a non-empty answer', async () => {
  const answer = vi.fn(async () => undefined);
  const questions = [{ question: 'Have you signed in?', options: [] }];
  render(<PermissionContext.Provider value={{ pendingPermissionRequests: [], handlePermissionDecision: () => undefined, answerAsyncQuestion: answer }}>
    <AsyncQuestionPanel questions={questions} questionId="login-question" />
  </PermissionContext.Provider>);

  const input = screen.getByRole('textbox', { name: 'Have you signed in?' });
  expect(document.activeElement).toBe(input);
  expect(screen.queryByText('Other...')).toBeNull();
  const submit = screen.getByRole('button', { name: 'Submit' });
  expect((submit as HTMLButtonElement).disabled).toBe(true);
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(answer).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: '  Signed in  ' } });
  expect((submit as HTMLButtonElement).disabled).toBe(false);
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(answer).toHaveBeenCalledTimes(1));
  expect(answer).toHaveBeenCalledWith(questions, { 'Have you signed in?': 'Signed in' });
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
});

test('multiple questions preserve selected choices and typed drafts when navigating back', async () => {
  const answer = vi.fn(async () => undefined);
  const questions = [
    { question: 'Which platforms?', multiSelect: true, options: [{ label: 'NAS', description: '' }, { label: 'Mac', description: '' }] },
    { question: 'Anything else?', options: [] },
  ];
  render(<PermissionContext.Provider value={{ pendingPermissionRequests: [], handlePermissionDecision: () => undefined, answerAsyncQuestion: answer }}>
    <AsyncQuestionPanel questions={questions} questionId="platform-question" />
  </PermissionContext.Provider>);

  fireEvent.click(screen.getByText('NAS').closest('button')!);
  fireEvent.click(screen.getByText('Mac').closest('button')!);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Anything else?' }), { target: { value: 'Keep both compatible' } });
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByText('NAS').closest('button')?.getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('Mac').closest('button')?.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect((screen.getByRole('textbox', { name: 'Anything else?' }) as HTMLInputElement).value).toBe('Keep both compatible');
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(answer).toHaveBeenCalledTimes(1));
  expect(answer).toHaveBeenCalledWith(questions, { 'Which platforms?': 'NAS, Mac', 'Anything else?': 'Keep both compatible' });
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull());
});
