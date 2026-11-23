import { memo, useMemo, useState } from 'react';
import { Bot, ChevronRight, CircleAlert, CircleCheck, CircleDashed } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DiffLine, LiveTaskStatus, Project, SubagentActivity, SubagentInfo, ToolResult } from '@/shared/types';
import { cn } from '@/shared/utils';
import { SubagentTimeline } from '@/modules/chat/tools/SubagentTimeline';
import { useIsExportingTranscript } from '@/modules/chat/context/TranscriptRenderContext';
import { MarkdownContent } from '@/modules/chat/tools/ContentRenderers/MarkdownContent';
import { resolveBackgroundTaskStatus } from '@/modules/chat/utils/backgroundTasks';

type SubagentPanelProps = {
  /** Raw tool input of the call that spawned the agent, used for the prompt. */
  toolInput: unknown;
  toolResult?: ToolResult | null;
  subagent?: SubagentInfo;
  /** The latest live word on a background agent, from the run's task events. */
  taskStatus?: LiveTaskStatus;
  activity?: SubagentActivity[];
  onFileOpen?: (filePath: string, diffInfo?: unknown) => void;
  createDiff: (oldStr: string, newStr: string) => DiffLine[];
  selectedProject?: Project | null;
};

function parseToolInput(toolInput: unknown): Record<string, unknown> {
  if (typeof toolInput !== 'string') {
    return (toolInput as Record<string, unknown>) || {};
  }
  try {
    return JSON.parse(toolInput) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Unwraps the block-array shape agent results sometimes arrive in
 * (`[{ type: 'text', text }]`) so the answer renders as markdown rather than
 * as JSON.
 */
function readResultText(content: unknown): string {
  if (Array.isArray(content)) {
    return content
      .filter((part) => typeof part === 'object' && part !== null && (part as { type?: string }).type === 'text')
      .map((part) => String((part as { text?: string }).text ?? ''))
      .join('\n\n');
  }

  const text = typeof content === 'string' ? content : content == null ? '' : JSON.stringify(content);
  const trimmed = text.trim();
  if (trimmed.startsWith('[')) {
    try {
      return readResultText(JSON.parse(trimmed));
    } catch {
      return text;
    }
  }
  return text;
}

const STATUS_STYLES: Record<SubagentInfo['status'], string> = {
  running: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  completed: 'bg-muted text-muted-foreground',
  failed: 'bg-destructive/10 text-destructive',
  stopped: 'bg-muted text-muted-foreground',
};

/**
 * Rendered by chat's MessageComponent for any tool call that spawned a
 * subagent — Claude's `Agent`/`Task` and Codex's `spawn_agent` both normalize
 * to the same shape, so both render through this one panel.
 *
 * The timeline is mounted only while the panel is open. The shared Collapsible
 * keeps its children mounted when closed, which for an agent that ran a
 * hundred tools would mean a hundred tool renderers on a collapsed row.
 */
export const SubagentPanel = memo(({
  toolInput,
  toolResult,
  subagent,
  taskStatus,
  activity,
  onFileOpen,
  createDiff,
  selectedProject,
}: SubagentPanelProps) => {
  const { t } = useTranslation('chat');
  // Collapsed by default: an agent is a summary of work, and its detail is
  // only wanted on demand.
  const isExporting = useIsExportingTranscript();
  const [isOpen, setIsOpen] = useState(false);
  const showTimeline = isOpen || isExporting;

  const parsedInput = useMemo(() => parseToolInput(toolInput), [toolInput]);
  const resultText = useMemo(() => readResultText(toolResult?.content), [toolResult?.content]);

  const entries = activity ?? [];
  // A background agent's tool result is only its launch acknowledgement — the
  // real answer arrives later as a task notification — so its arrival says
  // nothing about whether the agent finished. Treating it as an outcome marked
  // every background agent `completed` a second after it launched, which is
  // where the spinner went. Until the server reports one on `subagent` or the
  // live stream's task events say otherwise, an async launch is still
  // outstanding.
  const isAsyncAgentLaunch = Boolean(
    (toolResult?.toolUseResult as { isAsync?: boolean } | undefined)?.isAsync,
  );
  const status = resolveBackgroundTaskStatus(subagent?.status, taskStatus?.status)
    ?? (toolResult && !isAsyncAgentLaunch ? 'completed' : 'running');
  const type = subagent?.type?.trim() || String(parsedInput.subagent_type ?? '').trim();
  const label = subagent?.name?.trim() || type || t('subagent.title', 'Subagent');
  const prompt = typeof parsedInput.prompt === 'string' ? parsedInput.prompt.trim() : '';
  const rawDescription = (subagent?.description ?? String(parsedInput.description ?? '')).trim();
  const description = [label.toLowerCase(), 'agent', 'codex sub-agent'].includes(rawDescription.toLowerCase())
    ? '' : rawDescription;
  const collapsedTask = !showTimeline ? description || prompt : (description !== prompt ? description : '');

  return (
    <div className="my-1 min-w-0 rounded-lg border border-border/60 bg-muted/20">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex min-h-11 w-full select-none items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        <ChevronRight className={cn('h-3 w-3 flex-shrink-0 transition-transform duration-150 motion-reduce:transition-none', isOpen && 'rotate-90')} />
        <Bot className="h-3.5 w-3.5 flex-shrink-0 text-purple-500 dark:text-purple-400" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">{label}</span>
          {collapsedTask && <span className="mt-0.5 block truncate text-muted-foreground">{collapsedTask}</span>}
        </span>
        <span className={cn('flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_STYLES[status])}>
          {status === 'running' ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" />
              {t('subagent.running', 'running')}
            </>
          ) : status === 'failed' ? (
            <>
              <CircleAlert className="h-3 w-3" />
              {t('subagent.failed', 'failed')}
            </>
          ) : status === 'stopped' ? (
            // Neither a spinner nor a check mark: the agent never reported and
            // the process it ran in is gone, so there is no outcome to draw.
            <span title={t('subagent.stoppedHint', 'The run ended before this agent reported back')} className="flex items-center gap-1">
              <CircleDashed className="h-3 w-3" />
              {t('subagent.stopped', 'no result')}
            </span>
          ) : (
            <>
              <CircleCheck className="h-3 w-3" />
              {t('subagent.completed', 'done')}
            </>
          )}
        </span>
      </button>

      {showTimeline && (
        <div className="space-y-3 border-t border-border/50 px-3 py-3">
          {subagent?.model && (
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/50">{subagent.model}</div>
          )}

          {prompt && (
            <div className="rounded-md border border-border/50 bg-background/50 p-3">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">{t('subagent.task', 'Assigned task')}</div>
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{prompt}</div>
            </div>
          )}

          <SubagentTimeline
            activity={entries}
            activityCount={subagent?.activityCount}
            onFileOpen={onFileOpen}
            createDiff={createDiff}
            selectedProject={selectedProject}
          />

          {resultText && (
            <div className="rounded border border-border/40 bg-muted/30 p-2">
              <div className="mb-1 text-xs font-medium text-muted-foreground">{t('subagent.result', 'Result')}</div>
              <MarkdownContent content={resultText} className="prose prose-sm max-w-none dark:prose-invert" />
            </div>
          )}
        </div>
      )}
    </div>
  );
});
SubagentPanel.displayName = 'SubagentPanel';
