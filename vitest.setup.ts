import { cleanup } from '@testing-library/react';
import i18n from 'i18next';
import { afterEach, beforeEach } from 'vitest';

// Node 26 exposes native web storage even when it is unavailable. Vitest may
// retain those globals, so explicitly use jsdom's isolated browser storage.
// Vitest aliases window to globalThis; access the original DOM window instead.
const browserWindow = (globalThis as typeof globalThis & { jsdom: { window: Window } }).jsdom.window;
for (const key of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, key, {
    value: browserWindow[key],
    configurable: true,
    writable: true,
  });
}

// Business tests use English fixtures independently of the application's NAS
// default and any saved preference. Locale tests can choose a language per case.
// Observe initialization instead of importing the app: pure tests and component
// tests that mock react-i18next should not load preferences or UI dependencies.
i18n.on('initialized', () => {
  if (i18n.language !== 'en') {
    void i18n.changeLanguage('en');
  }
});
beforeEach(async () => {
  if (i18n.isInitialized && i18n.language !== 'en') {
    await i18n.changeLanguage('en');
  }
});

// Auto-cleanup only self-registers when vitest globals are enabled, and they are
// not. Without this, a hook rendered in one test stays mounted — with its timers
// and effects live — for the rest of the file.
afterEach(cleanup);

// jsdom ships no `matchMedia`, and components that pick a layout from the
// viewport call it during render. Report the desktop breakpoint, which is the
// layout the sidebar row tests assert on.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
