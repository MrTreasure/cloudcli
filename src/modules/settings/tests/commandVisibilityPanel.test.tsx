import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import '@/modules/i18n';
import { api } from '@/shared/api';
import { readUserPreference, resetUserPreferences } from '@/shared/userSettings';
import CommandsSettingsTab from '@/modules/settings/tabs/CommandsSettingsTab';

beforeEach(() => {
  localStorage.clear(); resetUserPreferences();
  vi.spyOn(api.commands, 'list').mockResolvedValue(new Response(JSON.stringify({ builtIn: [{ name: '/help' }], native: [{ name: '/compact' }, { name: '/goal' }] })));
  vi.spyOn(api.providers, 'skills').mockResolvedValue(new Response(JSON.stringify({ data: { skills: [] } })));
  vi.spyOn(api.user, 'savePreferences').mockResolvedValue(new Response('{}'));
});
afterEach(() => resetUserPreferences());

test('settings switches and bulk actions persist command visibility', async () => {
  render(<CommandsSettingsTab projects={[{ name: 'project', fullPath: '/tmp/project' }]} />);
  const compact = await screen.findByRole('switch', { name: '/compact' });
  expect(screen.getByRole('switch', { name: '/help' }).getAttribute('aria-checked')).toBe('false');
  fireEvent.click(compact);
  expect(compact.getAttribute('aria-checked')).toBe('false');
  expect(readUserPreference<{ hiddenSlashCommands?: { claude?: string[] } }>('uiPreferences', {}).hiddenSlashCommands?.claude).toContain('/compact');
  fireEvent.change(screen.getByRole('textbox', { name: /搜索命令|Search commands/ }), { target: { value: 'goal' } });
  await waitFor(() => expect(screen.queryByRole('switch', { name: '/compact' })).toBeNull());
  expect(screen.getByRole('switch', { name: '/goal' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /全部隐藏|Hide all/ }));
  expect(screen.getByRole('switch', { name: '/goal' }).getAttribute('aria-checked')).toBe('false');
});

test('long skill descriptions show only 200 characters but search still uses the complete metadata', async () => {
  const preview = '界'.repeat(200);
  vi.mocked(api.providers.skills).mockResolvedValue(new Response(JSON.stringify({ data: { skills: [{
    name: 'long-skill', command: '$long-skill', description: `${preview}tail-search-match`, sourcePath: '/tmp/SKILL.md', scope: 'global',
  }] } })));
  render(<CommandsSettingsTab projects={[{ name: 'project', fullPath: '/tmp/project' }]} />);
  expect(await screen.findByText(`${preview}…`)).toBeTruthy();
  expect(screen.queryByText(`${preview}tail-search-match`)).toBeNull();
  fireEvent.change(screen.getByRole('textbox', { name: /搜索命令|Search commands/ }), { target: { value: 'tail-search-match' } });
  await waitFor(() => expect(screen.getByRole('switch', { name: '$long-skill' })).toBeTruthy());
});
