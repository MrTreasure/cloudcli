import type { WorkspaceTask } from "../../shared/model.js";

export interface ScheduleListHandlers {
  onEdit(taskId: string): void;
  onDelete(taskId: string): void;
  onPause(taskId: string): void;
  onResume(taskId: string): void;
  onDuplicate(taskId: string): void;
  onRunNow(taskId: string): void;
}

function confirmDelete(taskName: string): boolean {
  if (typeof globalThis.confirm !== "function") {
    return true;
  }

  return globalThis.confirm(`删除计划 "${taskName}"?`);
}

export function renderScheduleList(
  tasks: WorkspaceTask[],
  handlers: ScheduleListHandlers,
  highlightedTaskId: string | null = null
): HTMLElement {
  const section = document.createElement("section");
  section.className = "schedule-list";
  section.innerHTML = "<h2>计划</h2>";

  if (!tasks.length) {
    const empty = document.createElement("p");
    empty.textContent = "尚无计划提示。";
    section.append(empty);
    return section;
  }

  const list = document.createElement("ul");
  for (const task of tasks) {
    const item = document.createElement("li");
    if (task.id === highlightedTaskId) {
      item.setAttribute("data-highlighted", "true");
      item.style.outline = "2px solid var(--wsp-success)";
      item.style.outlineOffset = "2px";
    }
    item.innerHTML = `
      <div class="wsp-task-head">
        <div>
          <strong>${task.name}</strong>
          <p>${task.recurrenceSummary}</p>
        </div>
        <span class="wsp-status-chip">${task.enabled ? "已启用" : "已暂停"}</span>
      </div>
      <div class="wsp-task-meta">
        <span>下次运行： ${task.nextRunAt ?? "未计划"}</span>
        <span>上次状态： ${task.lastRunStatus ?? "暂无"}</span>
        ${task.id === highlightedTaskId ? "<span>刚刚保存。</span>" : ""}
      </div>
    `;

    const controls = document.createElement("div");
    controls.className = "wsp-inline-actions";
    const edit = document.createElement("button");
    edit.textContent = "编辑";
    edit.addEventListener("click", () => handlers.onEdit(task.id));
    controls.append(edit);

    const toggle = document.createElement("button");
    toggle.textContent = task.enabled ? "暂停" : "恢复";
    toggle.addEventListener("click", () => (task.enabled ? handlers.onPause(task.id) : handlers.onResume(task.id)));
    controls.append(toggle);

    const duplicate = document.createElement("button");
    duplicate.textContent = "重复";
    duplicate.addEventListener("click", () => handlers.onDuplicate(task.id));
    controls.append(duplicate);

    const runNow = document.createElement("button");
    runNow.textContent = "立即运行";
    runNow.addEventListener("click", () => handlers.onRunNow(task.id));
    controls.append(runNow);

    const remove = document.createElement("button");
    remove.textContent = "删除";
    remove.addEventListener("click", () => {
      if (!confirmDelete(task.name)) {
        return;
      }
      handlers.onDelete(task.id);
    });
    controls.append(remove);

    item.append(controls);
    list.append(item);
  }

  section.append(list);
  return section;
}
