import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useCommandVisibility } from '@/shared/hooks/useCommandVisibility';
import { readUserPreference, resetUserPreferences, writeUserPreference } from '@/shared/userSettings';

beforeEach(() => { localStorage.clear(); resetUserPreferences(); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}'))); });
afterEach(() => { resetUserPreferences(); vi.unstubAllGlobals(); });

test('the ten unwanted menu commands are hidden by default', () => {
  const { result } = renderHook(() => useCommandVisibility('codex'));
  expect([...result.current.hiddenCommands]).toEqual(['/help', '/models', '/new', '/resume', '/fork', '/model', '/status', '/permissions', '/diff', '/mention']);
  expect(result.current.hiddenCommands.has('/compact')).toBe(false);
  expect(result.current.hiddenCommands.has('/goal')).toBe(false);
});

test('visibility changes reach other readers, preserve other preferences and stay provider-scoped', () => {
  writeUserPreference('uiPreferences', { fontSizes: { interfaceFontSize: 16 } });
  const first = renderHook(() => useCommandVisibility('codex'));
  const second = renderHook(() => useCommandVisibility('codex'));
  const claude = renderHook(() => useCommandVisibility('claude'));
  act(() => first.result.current.setCommandsVisible(['/compact'], false));
  expect(second.result.current.hiddenCommands.has('/compact')).toBe(true);
  expect(claude.result.current.hiddenCommands.has('/compact')).toBe(false);
  expect(readUserPreference<{ fontSizes?: unknown }>('uiPreferences', {}).fontSizes).toEqual({ interfaceFontSize: 16 });
  act(() => second.result.current.setCommandsVisible(['/compact', '/help'], true));
  expect(first.result.current.hiddenCommands.has('/compact')).toBe(false);
  expect(first.result.current.hiddenCommands.has('/help')).toBe(false);
  expect(claude.result.current.hiddenCommands.has('/help')).toBe(true);
});
