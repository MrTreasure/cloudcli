import { useState, useCallback, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronLeft, MessageCircleQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LocalizedText } from '@/shared/ui/LocalizedText';
import type { PermissionPanelProps, Question } from '@/shared/types';

/** Stable fallback so the memoized handlers below are not invalidated on every
 *  render by a fresh `[]` literal when a request carries no questions. */
const NO_QUESTIONS: Question[] = [];

/**
 * Used by chat's PermissionRequestsBanner and AsyncQuestionPanel to answer
 * Claude permission questions and Codex async questions in the transcript.
 */
export function AskUserQuestionPanel({ request, onDecision }: PermissionPanelProps) {
  const { t } = useTranslation();
  const input = request.input as { questions?: Question[] } | undefined;
  const questions: Question[] = input?.questions ?? NO_QUESTIONS;

  // Tracks the visible question while preserving answers from earlier steps.
  const [currentStep, setCurrentStep] = useState(0);
  // Keeps selected option labels for each question until submission.
  const [selections, setSelections] = useState<Map<number, Set<string>>>(() => new Map());
  // Retains typed replies for free-text questions and custom choices.
  const [otherTexts, setOtherTexts] = useState<Map<number, string>>(() => new Map());
  // Records whether a question with options is using a custom answer.
  const [otherActive, setOtherActive] = useState<Map<number, boolean>>(() => new Map());
  const isFreeText = questions[currentStep]?.options.length === 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  // Focus the container for keyboard events when step changes
  useEffect(() => {
    if (!isFreeText && !otherActive.get(currentStep)) {
      containerRef.current?.focus();
    }
  }, [currentStep, otherActive, isFreeText]);

  useEffect(() => {
    if (isFreeText || otherActive.get(currentStep)) {
      otherInputRef.current?.focus();
    }
  }, [otherActive, currentStep, isFreeText]);

  const toggleOption = useCallback((qIdx: number, label: string, multiSelect: boolean) => {
    setSelections(prev => {
      const next = new Map(prev);
      const current = new Set(next.get(qIdx) || []);
      if (multiSelect) {
        if (current.has(label)) current.delete(label);
        else current.add(label);
      } else {
        current.clear();
        current.add(label);
        setOtherActive(p => { const n = new Map(p); n.set(qIdx, false); return n; });
      }
      next.set(qIdx, current);
      return next;
    });
  }, []);

  const toggleOther = useCallback((qIdx: number, multiSelect: boolean) => {
    setOtherActive(prev => {
      const next = new Map(prev);
      const wasActive = next.get(qIdx) || false;
      next.set(qIdx, !wasActive);
      if (!multiSelect && !wasActive) {
        setSelections(p => { const n = new Map(p); n.set(qIdx, new Set()); return n; });
      }
      return next;
    });
  }, []);

  const setOtherText = useCallback((qIdx: number, text: string) => {
    setOtherTexts(prev => { const next = new Map(prev); next.set(qIdx, text); return next; });
  }, []);

  const buildAnswers = useCallback(() => {
    const answers: Record<string, string> = {};
    questions.forEach((q, idx) => {
      const selected = Array.from(selections.get(idx) || []);
      const isOther = q.options.length === 0 || otherActive.get(idx) || false;
      const otherText = (otherTexts.get(idx) || '').trim();
      if (isOther && otherText) selected.push(otherText);
      if (selected.length > 0) answers[q.question] = selected.join(', ');
    });
    return answers;
  }, [questions, selections, otherActive, otherTexts]);

  const handleSubmit = useCallback(() => {
    const answers = buildAnswers();
    if (Object.keys(answers).length === 0) return;
    onDecision(request.requestId, { allow: true, updatedInput: { ...input, answers } });
  }, [onDecision, request.requestId, input, buildAnswers]);

  const handleSkip = useCallback(() => {
    onDecision(request.requestId, { allow: true, updatedInput: { ...input, answers: {} } });
  }, [onDecision, request.requestId, input]);

  // Keyboard handler for number keys and navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture keys when typing in the "Other" input
    if (e.target instanceof HTMLInputElement) return;

    const q = questions[currentStep];
    if (!q) return;
    const multi = q.multiSelect || false;
    const optCount = q.options.length;

    // Number keys 1-9 for options
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= optCount) {
      e.preventDefault();
      toggleOption(currentStep, q.options[num - 1].label, multi);
      return;
    }

    // 0 for "Other"
    if (e.key === '0') {
      e.preventDefault();
      toggleOther(currentStep, multi);
      return;
    }

    // Enter to advance / submit
    if (e.key === 'Enter') {
      e.preventDefault();
      const isLast = currentStep === questions.length - 1;
      if (isLast) handleSubmit();
      else setCurrentStep(s => s + 1);
      return;
    }

    // Escape to skip
    if (e.key === 'Escape') {
      e.preventDefault();
      handleSkip();
      return;
    }
  }, [currentStep, questions, toggleOption, toggleOther, handleSubmit, handleSkip]);

  if (questions.length === 0) return null;

  const total = questions.length;
  const isSingle = total === 1;
  const q = questions[currentStep];
  const multi = q.multiSelect || false;
  const selected = selections.get(currentStep) || new Set<string>();
  const isOtherOn = isFreeText || otherActive.get(currentStep) || false;
  const isLast = currentStep === total - 1;
  const isFirst = currentStep === 0;
  const hasCurrentSelection = selected.size > 0 || (isOtherOn && (otherTexts.get(currentStep) || '').trim().length > 0);

  return (
    <div ref={containerRef} tabIndex={-1} onKeyDown={handleKeyDown} className="w-full min-w-0 max-w-3xl outline-none">
      <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="space-y-3 px-4 pb-3 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{t('chat:misc.needsYourInput', { provider: request.provider === 'codex' ? 'Codex' : 'Claude' })}</span>
            {q.header && (
              <span className="max-w-full break-words rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                {q.header}
              </span>
            )}
            {!isSingle && (
              <span className="ml-auto shrink-0 tabular-nums">{currentStep + 1} / {total}</span>
            )}
          </div>
          <p className="break-words text-sm font-medium leading-relaxed text-foreground">{q.question}</p>
          {multi && <p className="text-xs text-muted-foreground"><LocalizedText text="Select all that apply" /></p>}
          {!isSingle && (
            <div className="flex flex-wrap gap-1.5">
              {questions.map((question, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={question.question}
                  aria-current={index === currentStep ? 'step' : undefined}
                  onClick={() => setCurrentStep(index)}
                  className={`flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    index === currentStep ? 'bg-primary/10 font-medium text-primary' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="scrollbar-thin max-h-64 overflow-y-auto overscroll-contain px-4 pb-4" role="group" aria-label={q.question}>
          <div className="space-y-2">
            {q.options.map((option, index) => {
              const isSelected = selected.has(option.label);
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleOption(currentStep, option.label, multi)}
                  className={`group flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isSelected ? 'border-primary/50 bg-primary/5' : 'border-border bg-background/40 hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <kbd aria-hidden="true" className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded border border-border bg-muted/70 px-1 font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </kbd>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block break-words text-sm font-medium leading-snug text-foreground">{option.label}</span>
                    {option.description && <span className="block break-words text-xs leading-relaxed text-muted-foreground">{option.description}</span>}
                  </span>
                  <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}

            {!isFreeText && (
              <button
                type="button"
                aria-pressed={isOtherOn}
                onClick={() => toggleOther(currentStep, multi)}
                className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isOtherOn ? 'border-primary/50 bg-primary/5' : 'border-border bg-background/40 hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                <kbd aria-hidden="true" className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded border border-border bg-muted/70 px-1 font-mono text-xs text-muted-foreground">0</kbd>
                <span className="min-w-0 flex-1 text-sm text-foreground"><LocalizedText text="Other..." /></span>
                <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isOtherOn ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                  {isOtherOn && <Check className="h-3 w-3" />}
                </span>
              </button>
            )}

            {isOtherOn && (
              <input
                ref={otherInputRef}
                type="text"
                aria-label={q.question}
                value={otherTexts.get(currentStep) || ''}
                onChange={(event) => setOtherText(currentStep, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (isLast) handleSubmit();
                    else setCurrentStep(step => step + 1);
                  }
                  event.stopPropagation();
                }}
                placeholder={t('chat:misc.typeAnswer')}
                className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-2.5">
          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isSingle ? t('chat:misc.skipOne') : t('chat:misc.skipAll')}
            <kbd aria-hidden="true" className="hidden font-mono text-xs opacity-60 sm:inline">Esc</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {!isSingle && !isFirst && (
              <button
                type="button"
                onClick={() => setCurrentStep(step => step - 1)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <LocalizedText text="Back" />
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? handleSubmit : () => setCurrentStep(step => step + 1)}
              disabled={isLast && !hasCurrentSelection && !Object.keys(buildAnswers()).length}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              <LocalizedText text={isLast ? 'Submit' : 'Next'} />
              <kbd aria-hidden="true" className="hidden font-mono text-xs opacity-70 sm:inline">Enter</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
