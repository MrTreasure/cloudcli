import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Question } from '@/shared/types';
import { usePermission } from '@/modules/chat/context/PermissionContext';
import { AskUserQuestionPanel } from '@/modules/chat/tools/InteractiveRenderers/AskUserQuestionPanel';
import { QuestionAnswerContent } from '@/modules/chat/tools/ContentRenderers/QuestionAnswerContent';

/** Used by ToolRenderer for Codex async questions; submits choices as ordinary user input instead of tool approval. */
export function AsyncQuestionPanel({ questions, questionId }: { questions: Question[]; questionId: string }) {
  const { t } = useTranslation('chat');
  const permission = usePermission();
  // Retains the submitted choice while the conversation continues updating.
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);
  // Blocks duplicate submits while the answer is being sent or queued.
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  // Keeps a failed send actionable without clearing the selected question.
  const [error, setError] = useState(false);

  if (answers !== null) return <QuestionAnswerContent questions={questions} answers={answers} />;
  if (!permission?.answerAsyncQuestion) return <QuestionAnswerContent questions={questions} answers={{}} />;

  return <div>
    <div className={pending ? 'pointer-events-none opacity-60' : ''} aria-busy={pending}>
      <AskUserQuestionPanel request={{ requestId: questionId, provider: 'codex', toolName: 'AskUserQuestion', input: { questions } }}
        onDecision={async (_id, decision) => {
          if (inFlight.current) return;
          inFlight.current = true;
          const selected = (decision.updatedInput as { answers?: Record<string, string> })?.answers ?? {};
          setPending(true);
          setError(false);
          try {
            await permission.answerAsyncQuestion?.(questions, selected);
            setAnswers(selected);
          } catch {
            setError(true);
          } finally { inFlight.current = false; setPending(false); }
        }} />
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{t('misc.questionSendFailed')}</p>}
  </div>;
}
