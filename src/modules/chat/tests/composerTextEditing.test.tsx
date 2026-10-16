import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import '@/modules/i18n';
import { useChatComposerState } from '@/modules/chat/hooks/useChatComposerState';
import { readDraftText, resetChatDrafts } from '@/shared/chatDrafts';
import type { Project } from '@/shared/types';

vi.mock('@/shared/api', () => {
  const ok = (data: unknown) => Promise.resolve({ ok: true, json: async () => data });
  return { api: {
    getFiles: () => ok([]),
    user: {
      drafts: () => ok({ success: true, drafts: [] }),
      saveDraft: () => ok({ success: true }),
      deleteDraft: () => ok({ success: true }),
      preferences: () => ok({ success: true, preferences: {} }),
      savePreferences: () => ok({ success: true, preferences: {} }),
    },
    commands: { list: () => ok({ builtIn: [], custom: [] }) },
    providers: { skills: () => ok({ success: true, data: { skills: [] } }) },
  } };
});

const sendMessage = vi.fn();
const originalEditCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');
const PROJECT: Project = { projectId: 'keyboard-project', displayName: 'Keyboard', fullPath: '/tmp/keyboard' };

/** Drives the real draft, key handler and controlled textarea together. */
function ComposerHarness() {
  const { input, textareaRef, handleInputChange, handleTextareaInput, handleKeyDown } = useChatComposerState({
    selectedProject: PROJECT,
    selectedSession: { id: 'keyboard-session' },
    currentSessionId: 'keyboard-session',
    provider: 'codex',
    permissionMode: 'default',
    cyclePermissionMode: () => undefined,
    resolvePermissionModeForProvider: () => 'default',
    currentProviderModel: 'test-model',
    currentProviderEffort: 'medium',
    isLoading: false,
    canAbortSession: false,
    tokenBudget: null,
    sendMessage,
    scrollToBottom: () => undefined,
    addMessage: () => undefined,
    setIsUserScrolledUp: () => undefined,
    setPendingPermissionRequests: () => undefined,
  });
  return <textarea aria-label="Message" ref={textareaRef} value={input}
    onChange={handleInputChange} onInput={handleTextareaInput} onKeyDown={handleKeyDown} />;
}

function setup(value: string, start: number, end = start) {
  render(<ComposerHarness />);
  const input = screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
  input.focus();
  fireEvent.change(input, { target: { value } });
  input.setSelectionRange(start, end);
  return input;
}

beforeEach(() => {
  localStorage.clear();
  resetChatDrafts();
  sendMessage.mockClear();
});

afterEach(() => {
  resetChatDrafts();
  if (originalEditCommand) Object.defineProperty(document, 'execCommand', originalEditCommand);
  else Reflect.deleteProperty(document, 'execCommand');
});

test.each([
  { key: 'k', text: 'alpha\nbravo\ncharlie', start: 8, expected: 'alpha\nbr\ncharlie', caret: 8 },
  { key: 'u', text: 'alpha\nbravo\ncharlie', start: 8, expected: 'alpha\navo\ncharlie', caret: 6 },
  { key: 'k', text: 'alpha\nbravo\ncharlie', start: 11, expected: 'alpha\nbravocharlie', caret: 11 },
  { key: 'u', text: 'alpha\nbravo', start: 6, expected: 'alpha\nbravo', caret: 6 },
  { key: 'u', text: '\nnext', start: 0, expected: '\nnext', caret: 0 },
  { key: 'k', text: '', start: 0, expected: '', caret: 0 },
])('Ctrl+$key edits only the intended line at $start', ({ key, text, start, expected, caret }) => {
  const input = setup(text, start);
  expect(fireEvent.keyDown(input, { key, ctrlKey: true })).toBe(false);
  expect(input.value).toBe(expected);
  expect(input.selectionStart).toBe(caret);
  expect(input.selectionEnd).toBe(caret);
  expect(readDraftText('keyboard-session')).toBe(expected);
  expect(sendMessage).not.toHaveBeenCalled();
});

test.each(['k', 'u'])('Ctrl+%s deletes a selected range instead of adjacent text', (key) => {
  const input = setup('before selected after', 7, 15);
  fireEvent.keyDown(input, { key, ctrlKey: true });
  expect(input.value).toBe('before  after');
  expect(input.selectionStart).toBe(7);
  expect(readDraftText('keyboard-session')).toBe('before  after');
});

test('Ctrl+K is consumed inside the composer while Cmd+K still reaches global shortcuts', () => {
  const input = setup('hello world', 5);
  const paletteShortcut = vi.fn();
  document.addEventListener('keydown', paletteShortcut);
  try {
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
    expect(paletteShortcut).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'k', metaKey: true });
    expect(paletteShortcut).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('hello');
  } finally {
    document.removeEventListener('keydown', paletteShortcut);
  }
});

test.each([
  { key: 'Home' }, { key: 'End' }, { key: 'Home', ctrlKey: true, shiftKey: true },
  { key: 'ArrowLeft', ctrlKey: true }, { key: 'Backspace', ctrlKey: true },
  { key: 'a', ctrlKey: true }, { key: 'z', ctrlKey: true }, { key: 'y', ctrlKey: true },
  { key: 'v', metaKey: true }, { key: 'k', ctrlKey: true, shiftKey: true },
])('leaves native editing untouched: $key $ctrlKey $shiftKey', (keys) => {
  const input = setup('native editing', 4);
  expect(fireEvent.keyDown(input, keys)).toBe(true);
  expect(input.value).toBe('native editing');
  expect(sendMessage).not.toHaveBeenCalled();
});

test('composition and IME keyCode 229 do not delete text or submit a candidate', () => {
  const input = setup('中文输入', 2);
  fireEvent.compositionStart(input);
  fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input.value).toBe('中文输入');
  expect(sendMessage).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);
  fireEvent.keyDown(input, { key: 'u', ctrlKey: true, keyCode: 229 });
  expect(input.value).toBe('中文输入');
});

test('an immediate Enter sends the edited draft, including before React finishes rendering', async () => {
  const input = setup('prefix tail', 6);
  await act(async () => {
    fireEvent.keyDown(input, { key: 'u', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'Enter' });
  });
  await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
  expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'chat.send', content: ' tail' }));
});

test('uses the native edit command when available and synchronizes native undo input', () => {
  const input = setup('hello world', 5);
  const nativeDelete = vi.fn(() => {
    // Model a browser edit without an input event, which some engines omit.
    input.setRangeText('', input.selectionStart, input.selectionEnd, 'start');
    return true;
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: nativeDelete });
  fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
  expect(nativeDelete).toHaveBeenCalledWith('delete');
  expect(readDraftText('keyboard-session')).toBe('hello');
  expect(fireEvent.keyDown(input, { key: 'z', ctrlKey: true })).toBe(true);
  // A browser's native undo emits input; this tests state synchronization,
  // not whether jsdom implements an editing history (it does not).
  fireEvent.input(input, { target: { value: 'hello world' } });
  expect(readDraftText('keyboard-session')).toBe('hello world');
});

test('still edits safely when the browser rejects the native command', () => {
  const input = setup('hello world', 5);
  Object.defineProperty(document, 'execCommand', { configurable: true, value: () => { throw new Error('Unsupported'); } });
  fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
  expect(input.value).toBe('hello');
  expect(readDraftText('keyboard-session')).toBe('hello');
});
