import { sessionsDb } from '@/modules/database/index.js';
import { AppError } from '@/shared/utils.js';

/** Used by provider routes; Fast is application session metadata, never CPA policy or CLI configuration. */
export function createProviderSessionSettingsService(store = sessionsDb) {
  const readCodexSession = (sessionId: string) => {
    const session = store.getSessionById(sessionId);
    if (!session) throw new AppError('Session not found.', { code: 'SESSION_NOT_FOUND', statusCode: 404 });
    if (session.provider !== 'codex') throw new AppError('Fast is available only for Codex sessions.', {
      code: 'FAST_UNSUPPORTED', statusCode: 400,
    });
    return session;
  };
  return {
    getCodexFast(sessionId: string) {
      return { sessionId, codexFast: readCodexSession(sessionId).codex_fast === 1 };
    },
    setCodexFast(sessionId: string, codexFast: boolean) {
      readCodexSession(sessionId);
      store.setSessionCodexFast(sessionId, codexFast);
      return { sessionId, codexFast };
    },
  };
}

/** Provider routes use this service for authenticated per-session Fast reads and writes. */
export const providerSessionSettingsService = createProviderSessionSettingsService();
