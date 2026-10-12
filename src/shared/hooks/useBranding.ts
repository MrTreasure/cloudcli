import { useSyncExternalStore } from 'react';

import defaultLogo from '@/assets/c137-logo.webp';
import { readUserPreference, subscribeToUserPreferences, writeUserPreference } from '@/shared/userSettings';

type Branding = {
  title: string;
  logo: string;
  avatar: string | null;
};

const DEFAULT_TITLE = 'C137 实验室';
const DEFAULT_BRANDING: Branding = { title: DEFAULT_TITLE, logo: defaultLogo, avatar: null };
const IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

function readBranding(): Branding {
  const stored = readUserPreference<Partial<Branding>>('branding', {});
  const title = typeof stored.title === 'string' ? stored.title.slice(0, 60) : DEFAULT_TITLE;
  const logo = typeof stored.logo === 'string' && IMAGE_DATA_URL.test(stored.logo)
    ? stored.logo
    : defaultLogo;
  const avatar = typeof stored.avatar === 'string' && IMAGE_DATA_URL.test(stored.avatar)
    ? stored.avatar
    : null;
  return title === DEFAULT_TITLE && logo === defaultLogo && avatar === null
    ? DEFAULT_BRANDING
    : { title, logo, avatar };
}

let snapshot = readBranding();
function getSnapshot(): Branding {
  const next = readBranding();
  if (snapshot.title !== next.title || snapshot.logo !== next.logo || snapshot.avatar !== next.avatar) {
    snapshot = next;
  }
  return snapshot;
}

function updateBranding(change: Partial<Branding>): void {
  const current = readBranding();
  writeUserPreference('branding', { ...current, ...change });
}

/** Used by the sidebar, auth screens, transcript and appearance settings for account-backed branding. */
export function useBranding() {
  const branding = useSyncExternalStore(subscribeToUserPreferences, getSnapshot, () => DEFAULT_BRANDING);
  return { ...branding, updateBranding };
}
