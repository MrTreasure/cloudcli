import { useContext, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { TranscriptSessionContext } from '@/modules/chat/context/TranscriptSessionContext';
import type { AsyncUserInputQuestion } from '@/shared/types';

type AsyncQuestionCardProps = {
  questions: AsyncUserInputQuestion[];
  answered?: boolean;
};

/** Chat's MessageComponent renders native asynchronous questions here; responses use the normal session composer. */
export function AsyncQuestionCard({ questions, answered = false }: AsyncQuestionCardProps) {
  const { t } = useTranslation('chat');
  const { answerQuestion } = useContext(TranscriptSessionContext);
  // A selection index keeps duplicate labels and the free-text choice distinct.
  const [selections, setSelections] = useState<Record<number, number>>({});
  // Retain custom responses while users switch between a suggested answer and their own.
  const [otherTexts, setOtherTexts] = useState<Record<number, string>>({});
  // Prevent repeated submissions while the normal send/queue path is pending.
  const [busy, setBusy] = useState(false);
  // Keep accepted cards read-only until the subsequent user turn arrives in history.
  const [submitted, setSubmitted] = useState(false);
  // Failures stay beside the question and leave the selections available for retry.
  const [failed, setFailed] = useState(false);
  const submitting = useRef(false);
  const disabled = answered || submitted || busy || !answerQuestion;
  const values = questions.map((question, index) => selections[index] === -1
    ? otherTexts[index]?.trim() ?? '' : question.options?.[selections[index]] ?? '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled || submitting.current || !values.every(Boolean)) return;
    submitting.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const content = questions.map((question, index) => `${question.title}\n${values[index]}`).join('\n\n');
      const accepted = await answerQuestion?.(content);
      if (accepted) setSubmitted(true);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <form className="not-prose space-y-4 rounded-lg border border-border bg-muted/30 p-4" onSubmit={(event) => void submit(event)}>
      {questions.map((question, index) => (
        <fieldset key={index} disabled={disabled} className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{question.title}</legend>
          {(question.options ?? []).map((option, optionIndex) => (
            <label key={optionIndex} className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
              <input type="radio" name={`question-${index}`} className="mt-1" checked={selections[index] === optionIndex}
                onChange={() => setSelections((previous) => ({ ...previous, [index]: optionIndex }))} />
              <span>{option}</span>
            </label>
          ))}
          <label className="block space-y-1 text-sm">
            <span className="flex items-center gap-2">
              <input type="radio" name={`question-${index}`} checked={selections[index] === -1}
                onChange={() => setSelections((previous) => ({ ...previous, [index]: -1 }))} />
              {t('asyncQuestions.other')}
            </span>
            <input type="text" value={otherTexts[index] ?? ''} aria-label={`${question.title} — ${t('asyncQuestions.other')}`}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
              onChange={(event) => { setOtherTexts((previous) => ({ ...previous, [index]: event.target.value })); setSelections((previous) => ({ ...previous, [index]: -1 })); }} />
          </label>
        </fieldset>
      ))}
      {answered || submitted ? <p role="status" className="text-xs text-muted-foreground">{t('asyncQuestions.answered')}</p>
        : <button type="submit" disabled={disabled || !values.every(Boolean)} aria-busy={busy}
            className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? t('asyncQuestions.submitting') : t('asyncQuestions.submit')}
          </button>}
      {failed && <p role="alert" className="text-sm text-destructive">{t('asyncQuestions.failed')}</p>}
    </form>
  );
}
