import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { LLMProvider } from '@/shared/types';
import { readUserPreference, subscribeToUserPreferences, writeUserPreference } from '@/shared/userSettings';

const DEFAULT_HIDDEN_COMMANDS = ['/help', '/models', '/new', '/resume', '/fork', '/model', '/status', '/permissions', '/diff', '/mention'];

function readHiddenCommands(provider: LLMProvider): string[] {
  const stored = readUserPreference<{ hiddenSlashCommands?: Partial<Record<LLMProvider, unknown>> }>('uiPreferences', {});
  const names = stored?.hiddenSlashCommands?.[provider];
  return Array.isArray(names) ? names.filter((name): name is string => typeof name === 'string') : DEFAULT_HIDDEN_COMMANDS;
}

/** Used by settings and chat to keep per-provider menu visibility synchronized with account preferences. */
export function useCommandVisibility(provider: LLMProvider) {
  const readSnapshot = useCallback(() => JSON.stringify(readHiddenCommands(provider)), [provider]);
  const snapshot = useSyncExternalStore(subscribeToUserPreferences, readSnapshot, readSnapshot);
  const hiddenCommands = useMemo(() => new Set<string>(JSON.parse(snapshot)), [snapshot]);
  const setCommandsVisible = useCallback((names: string[], visible: boolean) => {
    const stored = readUserPreference<Record<string, unknown>>('uiPreferences', {});
    const current = stored.hiddenSlashCommands;
    const byProvider = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
    const hidden = new Set(readHiddenCommands(provider));
    for (const name of names) {
      if (visible) hidden.delete(name);
      else hidden.add(name);
    }
    writeUserPreference('uiPreferences', { ...stored, hiddenSlashCommands: { ...byProvider, [provider]: [...hidden] } });
  }, [provider]);
  return { hiddenCommands, setCommandsVisible };
}
