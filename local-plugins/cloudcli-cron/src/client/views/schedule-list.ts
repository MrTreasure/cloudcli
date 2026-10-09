import type { WorkspaceTask } from "../../shared/model.js";
import { displayLabel } from "../../shared/labels.js";
import { emptyState, escapeHtml, formatTime, icon } from "./ui.js";

export interface ScheduleListHandlers {
  onEdit(taskId: string): void;
  onDelete(taskId: string): void;
  onPause(taskId: string): void;
  onResume(taskId: string): void;
  onDuplicate(taskId: string): void;
  onRunNow(taskId: string): void;
  onCreate(): void;
}

export function renderScheduleList(
  tasks: WorkspaceTask[], handlers: ScheduleListHandlers, highlightedTaskId: string | null = null
): HTMLElement {
  const section = document.createElement("section");
  section.className = "schedule-list";
  section.innerHTML = `<div class="wsp-list-heading"><div class="wsp-section-title"><h2>我的计划</h2><span class="wsp-count">${tasks.length}</span></div><span class="wsp-status-chip">按设定时区执行</span></div>`;
  if (!tasks.length) {
    const empty = emptyState("让重复的工作按时完成", "安排代码检查、工作摘要或任何需要定期执行的提示词。");
    const create = document.createElement("button");
    create.className = "wsp-primary-button";
    create.innerHTML = `${icon("plus")}创建第一个计划`;
    create.addEventListener("click", handlers.onCreate);
    empty.append(create);section.append(empty);return section;
  }
  const list = document.createElement("ul");
  // Enabled schedules with the nearest run come first; keep the stored order untouched.
  const sorted = [...tasks].sort((a, b) => Number(b.enabled) - Number(a.enabled)
    || (a.nextRunAt ? Date.parse(a.nextRunAt) : Infinity) - (b.nextRunAt ? Date.parse(b.nextRunAt) : Infinity));
  for (const task of sorted) {
    const item = document.createElement("li");
    if (task.id === highlightedTaskId) item.dataset.highlighted = "true";
    item.innerHTML = `
      <div class="wsp-task-head"><div><strong>${escapeHtml(task.name)}</strong><p>${escapeHtml(task.recurrenceSummary)}</p></div>
      <span class="wsp-status-chip" data-status="${task.enabled ? "enabled" : "paused"}">${task.enabled ? "已启用" : "已暂停"}</span></div>
      <p class="wsp-prompt-preview">${escapeHtml(task.prompt)}</p>
      <div class="wsp-task-meta"><span class="wsp-next-time">${icon("clock")} 下次：${escapeHtml(formatTime(task.nextRunAt, task.recurrence.timezone))}</span>
      <span>上次运行：${task.lastRunStatus ? escapeHtml(displayLabel(task.lastRunStatus)) : "尚未运行"}</span>
      ${task.id === highlightedTaskId ? "<span>刚刚更新</span>" : ""}</div>`;
    const controls = document.createElement("div");controls.className = "wsp-inline-actions";
    const action = (text: string, click: () => void, className = "", symbol = "") => {
      const button = document.createElement("button");button.type = "button";button.className = className;
      button.innerHTML = (symbol ? icon(symbol) : "") + escapeHtml(text);button.addEventListener("click", click);controls.append(button);
    };
    action("立即运行", () => handlers.onRunNow(task.id), "", "play");
    action("编辑", () => handlers.onEdit(task.id));
    action(task.enabled ? "暂停" : "恢复", () => task.enabled ? handlers.onPause(task.id) : handlers.onResume(task.id));
    action("复制", () => handlers.onDuplicate(task.id));
    action("删除", () => {
      if (typeof globalThis.confirm === "function" && !globalThis.confirm(`删除计划“${task.name}”？`)) return;
      handlers.onDelete(task.id);
    }, "wsp-danger-button");
    item.append(controls);list.append(item);
  }
  section.append(list);return section;
}
