import { useState, useEffect } from 'react';

import { api } from '@/shared/api';
import { APP_VERSION } from '@/shared/constants';
import type { InstallMode, ReleaseInfo } from '@/shared/types';

/**
 * Compare two semantic version strings
 * Works only with numeric versions separated by dots (e.g. "1.2.3")
 * @param {string} v1 
 * @param {string} v2
 * @returns positive if v1 > v2, negative if v1 < v2, 0 if equal
 */
const compareVersions = (v1: string, v2: string) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) return p1 - p2;
  }
  return 0;
};


/** Used by sidebar and settings modules to report releases and server restart needs. */
export const useVersionCheck = (owner: string, repo: string) => {
  // Latest upstream version is retained for the upgrade dialog and comparison.
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  // Release notes populate the upgrade dialog without an additional request.
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  // Installation method determines the appropriate upgrade instructions.
  const [installMode, setInstallMode] = useState<InstallMode>('git');
  // A live server version detects upgrades made while this page stays open.
  const [runningVersion, setRunningVersion] = useState<string | null>(null);

  // An older open tab must not advertise a release already running on the NAS.
  const currentVersion = runningVersion && compareVersions(runningVersion, APP_VERSION) > 0
    ? runningVersion
    : APP_VERSION;
  const updateAvailable = latestVersion !== null && compareVersions(latestVersion, currentVersion) > 0;
  // Only a server older than the installed frontend needs restarting.
  const restartRequired = runningVersion !== null && compareVersions(APP_VERSION, runningVersion) > 0;

  useEffect(() => {
    let cancelled = false;
    const fetchHealth = async () => {
      try {
        const response = await api.version.health();
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        if (data.installMode === 'npm' || data.installMode === 'git') {
          setInstallMode(data.installMode);
        }
        // The server may be newer than this tab, or older if it needs a restart.
        if (typeof data.version === 'string' && data.version.length > 0) {
          setRunningVersion(data.version);
        }
      } catch {
        // Default to git / no restart hint on error
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5 * 60 * 1000);
    window.addEventListener('focus', fetchHealth);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', fetchHealth);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkVersion = async () => {
      try {
        const response = await api.version.latestRelease(owner, repo);
        if (!response.ok) throw new Error(`Release lookup failed: ${response.status}`);
        const data = await response.json();
        if (cancelled) return;

        // Handle the case where there might not be any releases
        if (typeof data.tag_name === 'string' && /^v?\d+\.\d+\.\d+$/.test(data.tag_name)) {
          const latest = data.tag_name.replace(/^v/, '');
          setLatestVersion(latest);

          // Store release information
          setReleaseInfo({
            title: data.name || data.tag_name,
            body: data.body || '',
            htmlUrl: data.html_url || `https://github.com/${owner}/${repo}/releases/latest`,
            publishedAt: data.published_at
          });
        } else {
          // No releases found, don't show update notification
          setLatestVersion(null);
          setReleaseInfo(null);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Version check failed:', error);
        // On error, don't show update notification
        setLatestVersion(null);
        setReleaseInfo(null);
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000); // Check every 5 minutes
    window.addEventListener('focus', checkVersion);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', checkVersion);
    };
  }, [owner, repo]);

  return { updateAvailable, latestVersion, currentVersion, releaseInfo, installMode, runningVersion, restartRequired };
};
