import { memo } from 'react';
import { ActivityIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { readContextWindowUsage } from '@/shared/utils';

type TokenUsageSummaryProps = {
  usage: Record<string, unknown> | null;
  onClick?: () => void;
};

/**
 * Rendered by chat's ChatComposer to show the session's context-window usage
 * and open the detailed token breakdown on click.
 */
function TokenUsageSummary({ usage, onClick }: TokenUsageSummaryProps) {
  const { t } = useTranslation();
  const { percentage } = readContextWindowUsage(usage);
  const label = percentage === null ? '—' : `${percentage}%`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-background/70 px-2 text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-2 sm:px-2.5"
      title={t('chat:misc.contextOccupancy', { percentage: label })}
      aria-label={t('chat:misc.contextOccupancy', { percentage: label })}
    >
      <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/10 text-primary">
        <ActivityIcon className="h-3.5 w-3.5" />
      </span>
      <span className="font-medium text-foreground">{label}</span>
    </button>
  );
}

/** Memoized: the composer re-renders on every keystroke and this row's numbers only move when a turn ends. */
export default memo(TokenUsageSummary);
