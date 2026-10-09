import { displayLabel } from "../../shared/labels.js";
import type { ScheduledRun } from "../../shared/model.js";

export interface RunHistoryHandlers {
  onRetry(runId: string): void;
}

function titleCase(value: string): string {
  return displayLabel(value);
}

export function renderRunHistory(runs: ScheduledRun[], handlers: RunHistoryHandlers): HTMLElement {
  const section = document.createElement("section");
  section.className = "run-history";
  section.innerHTML = "<h2>最近运行</h2>";

  if (!runs.length) {
    const empty = document.createElement("p");
    empty.textContent = "尚未记录任何运行。";
    section.append(empty);
    return section;
  }

  const list = document.createElement("ul");
  for (const run of runs) {
    const item = document.createElement("li");
    const head = document.createElement("div");
    head.className = "wsp-run-head";

    const title = document.createElement("strong");
    title.textContent = titleCase(run.status);
    head.append(title);

    const chip = document.createElement("span");
    chip.className = "wsp-status-chip";
    chip.textContent = titleCase(run.status);
    head.append(chip);

    const meta = document.createElement("div");
    meta.className = "wsp-run-meta";

    const outcome = document.createElement("span");
    outcome.textContent = run.outcomeSummary;
    meta.append(outcome);

    const scheduled = document.createElement("span");
    scheduled.textContent = `计划时间：${run.scheduledFor}`;
    meta.append(scheduled);

    if (run.failureReason) {
      const failure = document.createElement("span");
      failure.textContent = `失败原因：${run.failureReason}`;
      meta.append(failure);
    }

    item.append(head, meta);

    if (run.status === "failed" || run.status === "missed") {
      const actions = document.createElement("div");
      actions.className = "wsp-inline-actions";
      const retry = document.createElement("button");
      retry.textContent = "重试";
      retry.addEventListener("click", () => handlers.onRetry(run.id));
      actions.append(retry);
      item.append(actions);
    }

    list.append(item);
  }
  section.append(list);
  return section;
}
