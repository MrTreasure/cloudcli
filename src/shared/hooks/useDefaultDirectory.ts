import { useSyncExternalStore } from 'react';

import { readUserPreference, subscribeToUserPreferences } from '@/shared/userSettings';

function readDefaultDirectory(): string {
  const value = readUserPreference<unknown>('defaultDirectory', '');
  return typeof value === 'string' ? value.trim() : '';
}

/** Settings and folder pickers share the connected server's account-specific starting directory. */
export function useDefaultDirectory(): string {
  return useSyncExternalStore(subscribeToUserPreferences, readDefaultDirectory, readDefaultDirectory);
}
