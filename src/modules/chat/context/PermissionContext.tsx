import { createContext, useContext } from 'react';

import type { PendingPermissionRequest, Question } from '@/shared/types';

export type PermissionContextValue = {
  pendingPermissionRequests: PendingPermissionRequest[];
  handlePermissionDecision: (
    requestIds: string | string[],
    decision: { allow?: boolean; message?: string; rememberEntry?: string | null; updatedInput?: unknown },
  ) => void;
  answerAsyncQuestion?: (questions: Question[], answers: Record<string, string>) => Promise<void>;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function usePermission(): PermissionContextValue | null {
  return useContext(PermissionContext);
}

export default PermissionContext;
