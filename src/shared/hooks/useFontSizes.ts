import { useLayoutEffect, useSyncExternalStore } from 'react';

import { FILE_NAME_FONT_SIZE_OPTIONS, FONT_SIZE_DEFAULTS, INTERFACE_FONT_SIZE_OPTIONS } from '@/shared/constants';
import { readUserPreference, subscribeToUserPreferences, writeUserPreference } from '@/shared/userSettings';

type FontSizeKey = keyof typeof FONT_SIZE_DEFAULTS;

function readFontSize(key: FontSizeKey): number {
  const stored = readUserPreference<{ fontSizes?: Partial<Record<FontSizeKey, unknown>> }>('uiPreferences', {});
  const value = stored?.fontSizes?.[key];
  const options: readonly number[] = key === 'interfaceFontSize'
    ? INTERFACE_FONT_SIZE_OPTIONS
    : FILE_NAME_FONT_SIZE_OPTIONS;
  return typeof value === 'number' && options.includes(value) ? value : FONT_SIZE_DEFAULTS[key];
}

const readInterfaceFontSize = () => readFontSize('interfaceFontSize');
const readFileNameFontSize = () => readFontSize('fileNameFontSize');

function setFontSize(key: FontSizeKey, value: number): void {
  const options: readonly number[] = key === 'interfaceFontSize'
    ? INTERFACE_FONT_SIZE_OPTIONS
    : FILE_NAME_FONT_SIZE_OPTIONS;
  if (!options.includes(value)) return;
  const stored = readUserPreference<Record<string, unknown>>('uiPreferences', {});
  writeUserPreference('uiPreferences', {
    ...stored,
    fontSizes: {
      interfaceFontSize: readInterfaceFontSize(),
      fileNameFontSize: readFileNameFontSize(),
      [key]: value,
    },
  });
}

/** Used by appearance settings and App to read live, account-backed font sizes. */
export function useFontSizes() {
  const interfaceFontSize = useSyncExternalStore(subscribeToUserPreferences, readInterfaceFontSize, readInterfaceFontSize);
  const fileNameFontSize = useSyncExternalStore(subscribeToUserPreferences, readFileNameFontSize, readFileNameFontSize);
  return { interfaceFontSize, fileNameFontSize, setFontSize };
}

/** Mounted by App to apply saved sizes to UI rem units and file-name CSS tokens. */
export function useApplicationFontSizes(): void {
  const { interfaceFontSize, fileNameFontSize } = useFontSizes();
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousSize = root.style.fontSize;
    const previousFileSize = root.style.getPropertyValue('--file-name-font-size');
    root.style.fontSize = `${interfaceFontSize}px`;
    root.style.setProperty('--file-name-font-size', `${fileNameFontSize}px`);
    return () => {
      root.style.fontSize = previousSize;
      if (previousFileSize) root.style.setProperty('--file-name-font-size', previousFileSize);
      else root.style.removeProperty('--file-name-font-size');
    };
  }, [interfaceFontSize, fileNameFontSize]);
}
