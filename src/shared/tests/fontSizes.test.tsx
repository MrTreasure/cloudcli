import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { api } from '@/shared/api';
import { UiPreferencesProvider, useSetUiPreference } from '@/shared/context/UiPreferencesContext';
import { useApplicationFontSizes, useFontSizes } from '@/shared/hooks/useFontSizes';
import { readUserPreference, resetUserPreferences, writeUserPreference } from '@/shared/userSettings';

beforeEach(() => {
  resetUserPreferences();
  vi.spyOn(api.user, 'savePreferences').mockResolvedValue(new Response('{}'));
});

afterEach(() => {
  resetUserPreferences();
  vi.useRealTimers();
});

test('mounting applies 16px defaults without saving over unhydrated preferences', () => {
  const { result, unmount } = renderHook(() => {
    useApplicationFontSizes();
    return useFontSizes();
  });
  expect(result.current.interfaceFontSize).toBe(16);
  expect(result.current.fileNameFontSize).toBe(16);
  expect(document.documentElement.style.fontSize).toBe('16px');
  expect(document.documentElement.style.getPropertyValue('--file-name-font-size')).toBe('16px');
  expect(readUserPreference('uiPreferences', null)).toBeNull();
  unmount();
  expect(document.documentElement.style.fontSize).toBe('');
});

test('changing either size is immediate and preserves the other size and UI toggles', () => {
  writeUserPreference('uiPreferences', { showThinking: false });
  const { result } = renderHook(() => {
    useApplicationFontSizes();
    return useFontSizes();
  });
  act(() => {
    result.current.setFontSize('interfaceFontSize', 20);
    result.current.setFontSize('fileNameFontSize', 24);
  });
  expect(document.documentElement.style.fontSize).toBe('20px');
  expect(document.documentElement.style.getPropertyValue('--file-name-font-size')).toBe('24px');
  expect(readUserPreference('uiPreferences', {})).toEqual({
    showThinking: false,
    fontSizes: { interfaceFontSize: 20, fileNameFontSize: 24 },
  });
});

test('an existing UI toggle cannot erase font sizes', () => {
  writeUserPreference('uiPreferences', {
    fontSizes: { interfaceFontSize: 18, fileNameFontSize: 22 },
  });
  const { result } = renderHook(() => ({ fonts: useFontSizes(), toggle: useSetUiPreference() }), {
    wrapper: UiPreferencesProvider,
  });
  act(() => result.current.toggle('showThinking', false));
  expect(result.current.fonts.interfaceFontSize).toBe(18);
  expect(result.current.fonts.fileNameFontSize).toBe(22);
  expect(readUserPreference<{ fontSizes?: unknown }>('uiPreferences', {}).fontSizes).toEqual({
    interfaceFontSize: 18, fileNameFontSize: 22,
  });
});

test('selected sizes are mirrored locally and included in the account save request', async () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useFontSizes());
  act(() => result.current.setFontSize('fileNameFontSize', 22));
  const mirror = JSON.parse(localStorage.getItem('user-preferences') || '{}');
  expect(mirror.uiPreferences.fontSizes).toEqual({ interfaceFontSize: 16, fileNameFontSize: 22 });
  await act(async () => vi.advanceTimersByTimeAsync(401));
  expect(api.user.savePreferences).toHaveBeenCalledWith({
    uiPreferences: { fontSizes: { interfaceFontSize: 16, fileNameFontSize: 22 } },
  });
});

test('server preference hydration updates sizes and malformed values use defaults', () => {
  const { result } = renderHook(() => useFontSizes());
  act(() => writeUserPreference('uiPreferences', {
    fontSizes: { interfaceFontSize: 18, fileNameFontSize: 20 },
  }));
  expect(result.current.interfaceFontSize).toBe(18);
  expect(result.current.fileNameFontSize).toBe(20);
  act(() => writeUserPreference('uiPreferences', {
    fontSizes: { interfaceFontSize: -1, fileNameFontSize: 'oops' },
  }));
  expect(result.current.interfaceFontSize).toBe(16);
  expect(result.current.fileNameFontSize).toBe(16);
  act(() => result.current.setFontSize('interfaceFontSize', 100));
  expect(result.current.interfaceFontSize).toBe(16);
});
