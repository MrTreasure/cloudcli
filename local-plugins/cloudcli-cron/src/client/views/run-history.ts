import { displayLabel } from "../../shared/labels.js";
import type { ScheduledRun } from "../../shared/model.js";
import { emptyState, formatTime, icon } from "./ui.js";

export interface RunHistoryHandlers { onRetry(runId: string): void; }

export function renderRunHistory(
  runs: ScheduledRun[], handlers: RunHistoryHandlers, taskNames: Map<string, string> = new Map()
): HTMLElement {
  const section = document.createElement("section");section.className = "run-history";
  section.innerHTML = `<div class="wsp-section-title">${icon("history")}<h2>运行记录</h2><span class="wsp-count">${runs.length}</span></div>`;
  if (!runs.length) {
    section.append(emptyState("等待第一次运行", "计划执行后，这里会显示结果与异常。", "history"));return section;
  }
  const sorted = [...runs].sort((a, b) => Date.parse(b.scheduledFor) - Date.parse(a.scheduledFor));
  const renderList = (entries: ScheduledRun[]): HTMLElement => {
    const list = document.createElement("ul");
    for (const run of entries) {
      const item = document.createElement("li");item.dataset.status = run.status;
      const head = document.createElement("div");head.className = "wsp-run-head";
      const title = document.createElement("strong");title.textContent = taskNames.get(run.taskId) ?? "计划执行";
      const chip = document.createElement("span");chip.className = "wsp-status-chip";chip.dataset.status = run.status;
      chip.textContent = displayLabel(run.status);head.append(title, chip);
      const meta = document.createElement("div");meta.className = "wsp-run-meta";
      const date = document.createElement("span");date.textContent = formatTime(run.startedAt ?? run.scheduledFor);date.title = run.scheduledFor;
      const outcome = document.createElement("span");outcome.textContent = run.outcomeSummary;
      meta.append(date, outcome);
      if (run.failureReason) {const failure = document.createElement("span");failure.className = "wsp-run-failure";failure.textContent = run.failureReason;meta.append(failure);}
      item.append(head, meta);
      if (run.status === "failed" || run.status === "missed") {
        const actions = document.createElement("div");actions.className = "wsp-inline-actions";
        const retry = document.createElement("button");retry.textContent = "重试";retry.type = "button";
        retry.addEventListener("click", () => handlers.onRetry(run.id));actions.append(retry);item.append(actions);
      }
      list.append(item);
    }
    return list;
  };
  section.append(renderList(sorted.slice(0, 8)));
  if (sorted.length > 8) {
    const older = document.createElement("details");older.className = "wsp-more-history";
    const summary = document.createElement("summary");summary.textContent = `查看更早的 ${sorted.length - 8} 条记录`;
    older.append(summary);older.addEventListener("toggle", () => {
      if (older.open && !older.querySelector("ul")) older.append(renderList(sorted.slice(8)));
    });section.append(older);
  }
  return section;
}
