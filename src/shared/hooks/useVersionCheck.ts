import { useState } from 'react';

import { api } from '@/shared/api';
import { APP_VERSION } from '@/shared/constants';
import { useAdaptivePolling } from '@/shared/hooks/useAdaptivePolling';
import type { InstallMode, ReleaseInfo } from '@/shared/types';

/** Official stable releases use numeric dotted versions. */
const compareVersions = (first: string, second: string) => {
  const left = first.split('.').map(Number);
  const right = second.split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

/** Used by the sidebar to compare official releases with the deployed application. */
export const useVersionCheck = (owner: string, repo: string) => {
  // GitHub's latest verified release drives the upgrade notice and release modal.
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  // Keep the release description together with the version shown to the user.
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  // The backend reports which update instructions apply to this installation.
  const [installMode, setInstallMode] = useState<InstallMode>('git');
  // An open browser may still run an old bundle after the server has been upgraded.
  const [runningVersion, setRunningVersion] = useState<string | null>(null);

  useAdaptivePolling({
    active: false,
    identity: `${owner}/${repo}`,
    idleMs: 5 * 60 * 1000,
    hiddenMs: 15 * 60 * 1000,
    refresh: async (signal) => {
      const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
      const readResponse = async (request: Promise<Response>) => {
        const response = await request;
        if (!response.ok) throw new Error(`Version check HTTP ${response.status}`);
        return response.json();
      };
      // Settle both reads before updating state: a quick GitHub response should
      // not briefly offer an update while the current server version is loading.
      const [health, release] = await Promise.allSettled([
        readResponse(api.system.health({ signal: requestSignal })),
        readResponse(api.system.latestRelease(owner, repo, { signal: requestSignal })),
      ]);
      if (signal.aborted) return;

      if (health.status === 'fulfilled') {
        const data = health.value;
        if (data?.installMode === 'npm' || data?.installMode === 'git') {
          setInstallMode(data.installMode);
        }
        if (typeof data?.version === 'string' && /^\d+\.\d+\.\d+$/.test(data.version)) {
          setRunningVersion(data.version);
        }
      }

      const data = release.status === 'fulfilled' ? release.value : null;
      const latest = typeof data?.tag_name === 'string' ? data.tag_name.replace(/^v/, '') : '';
      if (/^\d+\.\d+\.\d+$/.test(latest)) {
        setLatestVersion(latest);
        setReleaseInfo({
          title: data.name || data.tag_name,
          body: data.body || '',
          htmlUrl: data.html_url || `https://github.com/${owner}/${repo}/releases/latest`,
          publishedAt: data.published_at,
        });
      } else {
        setLatestVersion(null);
        setReleaseInfo(null);
      }
    },
  });

  // Use the newer installed component, so neither an old tab nor an old server
  // process offers to reinstall a release already present on this installation.
  const currentVersion = runningVersion && compareVersions(runningVersion, APP_VERSION) > 0
    ? runningVersion : APP_VERSION;
  const updateAvailable = latestVersion !== null && compareVersions(latestVersion, currentVersion) > 0;
  // A newer server with an older browser needs a page refresh, not a restart.
  const restartRequired = runningVersion !== null && compareVersions(runningVersion, APP_VERSION) < 0;

  return { updateAvailable, latestVersion, currentVersion, releaseInfo, installMode, runningVersion, restartRequired };
};
