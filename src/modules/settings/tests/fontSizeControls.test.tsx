import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import AppearanceSettingsTab from '@/modules/settings/tabs/AppearanceSettingsTab';
import { api } from '@/shared/api';
import { CODE_EDITOR_DEFAULTS } from '@/shared/constants';
import { readUserPreference, resetUserPreferences } from '@/shared/userSettings';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }) }));
vi.mock('@/modules/i18n', () => ({ LanguageSelector: () => null }));
vi.mock('@/shared/ui/LocalizedText', () => ({ LocalizedText: ({ text }: { text: string }) => text }));
vi.mock('@/shared/context/ThemeContext', () => ({ useTheme: () => ({ themeMode: 'system', setThemeMode: vi.fn() }) }));

beforeEach(() => {
  resetUserPreferences();
  vi.spyOn(api.user, 'savePreferences').mockResolvedValue(new Response('{}'));
});
afterEach(() => resetUserPreferences());

test('appearance controls save interface and file name sizes separately from code body size', () => {
  const changeCodeSize = vi.fn();
  render(<AppearanceSettingsTab
    projectSortOrder="name"
    onProjectSortOrderChange={vi.fn()}
    codeEditorSettings={{ ...CODE_EDITOR_DEFAULTS }}
    onCodeEditorWordWrapChange={vi.fn()}
    onCodeEditorShowMinimapChange={vi.fn()}
    onCodeEditorLineNumbersChange={vi.fn()}
    onCodeEditorFontSizeChange={changeCodeSize}
  />);
  const interfaceControl = screen.getByRole('combobox', { name: 'Interface font size' });
  const fileControl = screen.getByRole('combobox', { name: 'File name font size' });
  expect((interfaceControl as HTMLSelectElement).value).toBe('16');
  expect((fileControl as HTMLSelectElement).value).toBe('16');
  fireEvent.change(interfaceControl, { target: { value: '18' } });
  fireEvent.change(fileControl, { target: { value: '24' } });
  expect(readUserPreference<{ fontSizes?: unknown }>('uiPreferences', {}).fontSizes).toEqual({
    interfaceFontSize: 18, fileNameFontSize: 24,
  });
  expect(changeCodeSize).not.toHaveBeenCalled();
});
