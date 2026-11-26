import { resolveCodexExecutable } from '@/shared/utils.js';

/** Used by the app-server client and the WebSocket Shell tab to launch the host Codex CLI. */
export function resolveCodexCommandLine(): [command: string, ...args: string[]] {
  const launcher = resolveCodexExecutable();
  return /\.[cm]?js$/i.test(launcher) ? [process.execPath, launcher] : [launcher];
}
