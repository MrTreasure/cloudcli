import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { ContextWindowUsage, Project, ProjectSession, QuickSettingsTab, SlashCommand } from '@/shared/types';

//----------------- DEPLOYMENT MODE ------------

/**
 * Indicates whether the app runs in Platform mode (hosted) or OSS mode (self-hosted).
 * Read it to hide or gate features that only exist in one of the two deployments.
 */
export const IS_PLATFORM = import.meta.env?.VITE_IS_PLATFORM === 'true';

// ---------------------------

//----------------- BACKEND TRANSPORT ------------

/** Resolves backend paths for API, SSE, uploads and assets in split deployments. */
export function backendUrl(path: string): string {
  const origin = import.meta.env?.VITE_API_ORIGIN?.trim();
  return origin && path.startsWith('/') && !path.startsWith('//')
    ? new URL(path, origin).href
    : path;
}

/** Resolves authenticated chat and terminal socket paths to the backend origin. */
export function backendWebSocketUrl(path: string): string {
  const url = new URL(backendUrl(path), window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}

// ---------------------------

//----------------- INTERFACE TRANSLATION KEYS ------------

/** Provides a stable resource key for static UI labels, shared by translation renderers. */
export function interfaceTextKey(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return `label_${(hash >>> 0).toString(16)}`;
}

// ---------------------------

//----------------- TAILWIND CLASS COMPOSITION ------------

/**
 * Merges conditional class names and resolves conflicting Tailwind utilities so the
 * last-specified utility wins. Use it for every className built from props or state.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------

//----------------- CLIPBOARD ------------

/**
 * Copies text with `document.execCommand`, the only path that works in browsers or
 * contexts where the async Clipboard API is unavailable. Private to `copyTextToClipboard`.
 */
function fallbackCopyToClipboard(text: string): boolean {
  if (!text || typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(textarea);
  }

  return copied;
}

/**
 * Copies text to the clipboard, falling back to a hidden textarea when the Clipboard API
 * is blocked. Resolves to whether the copy succeeded so callers can show copied feedback.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) {
    return false;
  }

  let copied = false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch {
    copied = false;
  }

  if (!copied) {
    copied = fallbackCopyToClipboard(text);
  }

  return copied;
}

// ---------------------------

//----------------- NOTIFICATION SOUND ------------

/** localStorage key holding the user's completion-sound preference. Private to the sound helpers. */
const NOTIFICATION_SOUND_ENABLED_STORAGE_KEY = 'notificationSoundEnabled';

/** The browser's AudioContext constructor, including the webkit-prefixed fallback; undefined outside a browser. */
const AudioContextConstructor =
  typeof window !== 'undefined'
    ? window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    : undefined;

/** Lazily created and reused, because browsers cap how many AudioContexts a page may open. */
let audioContext: AudioContext | null = null;

/** Reports whether the user has left completion sounds on; defaults to on when unset. */
export const isNotificationSoundEnabled = (): boolean => {
  if (typeof localStorage === 'undefined') {
    return true;
  }

  return localStorage.getItem(NOTIFICATION_SOUND_ENABLED_STORAGE_KEY) !== 'false';
};

/** Persists the user's completion-sound preference; call it from settings toggles. */
export const setNotificationSoundEnabled = (enabled: boolean): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(NOTIFICATION_SOUND_ENABLED_STORAGE_KEY, String(enabled));
};

/** Returns the shared AudioContext, creating it on first use. Private to the sound helpers. */
const getAudioContext = (): AudioContext | null => {
  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextConstructor();
  }

  return audioContext;
};

/** Schedules one synthesized sine tone on the shared context. Private to `playNotificationSound`. */
const playTone = (
  context: AudioContext,
  frequency: number,
  startsAt: number,
  duration: number,
  peakVolume: number,
): void => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startsAt);

  // Shape the volume so the synthesized tone starts and stops cleanly.
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(peakVolume, startsAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
};

/**
 * Plays the two-tone notification chime, honouring the user's preference unless `force`
 * is set (settings previews pass `force` so the user can hear the sound while it is off).
 */
export const playNotificationSound = async ({ force = false } = {}): Promise<void> => {
  if (!force && !isNotificationSoundEnabled()) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  try {
    if (context.state === 'suspended') {
      await context.resume();
    }

    const now = context.currentTime;
    playTone(context, 740, now, 0.12, 0.075);
    playTone(context, 988, now + 0.11, 0.16, 0.06);
  } catch (error) {
    // Browsers may block audio until the page receives a user gesture.
    console.warn('Unable to play notification sound:', error);
  }
};

/** Plays the chime for a finished assistant turn; named for the chat call site it serves. */
export const playChatCompletionSound = (options = {}): Promise<void> => playNotificationSound(options);

// ---------------------------

//----------------- DOCUMENT TITLE ------------

/** Browser tab title shown when no project or session is selected. Private to the title helpers. */
const DEFAULT_PAGE_TITLE = 'CloudCLI UI';

/**
 * Resolves the human-readable label for a session: the persisted `summary` (the custom
 * name the sessions API returns for every provider, Cursor included), else the `name` a
 * Cursor session object may carry locally, else the provider's placeholder. Reads the
 * same fields in the same order as the sidebar row, so the header, document title and
 * sidebar never disagree about a session's name.
 */
export const getSessionTitle = (session: ProjectSession): string => {
  const title = (session.summary as string) || (session.name as string);
  if (session.__provider === 'cursor') {
    return title || 'Untitled Session';
  }

  return title || 'New Session';
};

/**
 * Builds the browser tab title for the current selection: the session title when one is
 * open, otherwise the project name, otherwise the app name.
 */
export const getPageTitle = (
  selectedProject: Project | null,
  selectedSession: ProjectSession | null,
): string => {
  if (selectedSession) {
    return getSessionTitle(selectedSession);
  }

  const displayName = selectedProject?.displayName?.trim();
  return displayName ? `${displayName} - ${DEFAULT_PAGE_TITLE}` : DEFAULT_PAGE_TITLE;
};

// ---------------------------

//----------------- SLASH COMMANDS ------------

/**
 * Whether a slash command is a provider skill (as opposed to a built-in or a
 * custom `.md` command). Skills are mapped with `type: 'skill'`; the metadata
 * check catches entries that only carry the skill marker there. Used wherever
 * commands are grouped or executed differently by kind.
 */
export const isSkillCommand = (command: SlashCommand): boolean =>
  command.type === 'skill' || command.metadata?.type === 'skill';

// ---------------------------

//----------------- QUICK SETTINGS PANEL ------------

/** DOM id of a quick settings tab button; pairs with `getQuickSettingsTabPanelId` for aria-controls / aria-labelledby. */
export const getQuickSettingsTabId = (tab: QuickSettingsTab): string => `quick-settings-tab-${tab}`;

/** DOM id of the tabpanel a quick settings tab controls; pairs with `getQuickSettingsTabId`. */
export const getQuickSettingsTabPanelId = (tab: QuickSettingsTab): string => `quick-settings-tabpanel-${tab}`;

//----------------- CONTEXT WINDOW USAGE ------------

/** Used by chat's summary and details to interpret current occupancy without confusing missing data with zero. */
export function readContextWindowUsage(usage: { used?: unknown; total?: unknown; contextUnavailable?: unknown } | null | undefined): ContextWindowUsage {
  const usedValue = usage?.used == null ? NaN : Number(usage.used);
  const totalValue = usage?.total == null ? NaN : Number(usage.total);
  const used = !usage?.contextUnavailable && Number.isFinite(usedValue) && usedValue >= 0 ? usedValue : null;
  const total = Number.isFinite(totalValue) && totalValue > 0 ? totalValue : null;
  return { used, total, percentage: used !== null && total !== null ? Math.round(used / total * 1000) / 10 : null };
}

/** Used by chat context summaries and details to abbreviate counts in decimal thousands. */
export function formatContextTokenCount(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`
    : value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
