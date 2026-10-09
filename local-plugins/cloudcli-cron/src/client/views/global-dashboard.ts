import { emptyState, formatTime } from "./ui.js";
import { displayLabel } from "../../shared/labels.js";
import type {
  GlobalDashboardFilter,
  GlobalDashboardSortBy,
  GlobalDashboardSnapshot,
  GlobalDashboardStatusFilter,
  GlobalJobRecord,
  WorkspaceAvailabilityState
} from "../../shared/model.js";

export interface GlobalDashboardHandlers {
  onRefresh(): void;
  onSetStatusFilter(status?: GlobalDashboardStatusFilter): void;
  onSetWorkspaceFilter(workspaceKey?: string): void;
  onSetSortBy(sortBy: GlobalDashboardSortBy): void;
  onOpenWorkspace(workspacePath: string, taskId: string): void;
  onRunNow(workspaceKey: string, taskId: string): void;
  onPause(workspaceKey: string, taskId: string): void;
  onResume(workspaceKey: string, taskId: string): void;
  onRetry(workspaceKey: string, taskId: string, runId: string): void;
}

function statusLabel(job: GlobalJobRecord): string {
  return displayLabel(job.lastRunStatus);
}

function isProblemJob(job: GlobalJobRecord): boolean {
  if (job.workspaceAvailability !== "available") {
    return true;
  }
  if (job.scheduleType === "one_time" && job.lastRunStatus === "succeeded" && !job.nextRunAt) {
    return false;
  }
  return (
    job.lastRunStatus === "failed" ||
    job.lastRunStatus === "missed" ||
    job.lastRunStatus === "paused" ||
    job.lastRunStatus === "never_run" ||
    (job.enabled && !job.nextRunAt)
  );
}

function workspaceLabel(workspace: WorkspaceAvailabilityState): string {
  return workspace.status === "available"
    ? `${workspace.workspaceLabel} (${workspace.jobCount})`
    : `${workspace.workspaceLabel} (${displayLabel(workspace.status)})`;
}

function renderWorkspaceSummary(workspaces: WorkspaceAvailabilityState[]): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "wsp-global-workspaces";

  for (const workspace of workspaces) {
    const item = document.createElement("div");
    item.className = "wsp-global-workspace-pill";
    item.dataset.status = workspace.status;
    item.textContent = workspaceLabel(workspace);
    wrapper.append(item);
  }

  return wrapper;
}

function appendSelectOption(select: HTMLSelectElement, value: string, label: string, selected: boolean): void {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  select.append(option);
}

function buildFilterField(
  fieldLabel: string,
  selectName: string,
  options: Array<{ value: string; label: string; selected: boolean }>
): HTMLLabelElement {
  const field = document.createElement("label");
  field.className = "wsp-field";

  const label = document.createElement("span");
  label.textContent = fieldLabel;

  const select = document.createElement("select");
  select.name = selectName;

  for (const option of options) {
    appendSelectOption(select, option.value, option.label, option.selected);
  }

  field.append(label, select);
  return field;
}

function actionButtonLabel(action: "run_now" | "pause" | "resume" | "retry"): string {
  switch (action) {
    case "run_now":
      return "立即运行";
    case "pause":
      return "暂停";
    case "resume":
      return "恢复";
    case "retry":
      return "重试";
  }
}

function appendMeta(item: HTMLElement, label: string): void {
  const entry = document.createElement("span");
  entry.textContent = label;
  item.append(entry);
}

export function renderGlobalDashboard(
  snapshot: GlobalDashboardSnapshot | null,
  busy: boolean,
  error: string | null,
  filters: GlobalDashboardFilter,
  handlers: GlobalDashboardHandlers,
  pendingActionKey: string | null = null
): HTMLElement {
  const section = document.createElement("section");
  section.className = "wsp-global-dashboard wsp-panel";

  const header = document.createElement("div");
  header.className = "wsp-global-dashboard-head";
  header.innerHTML = `
    <div class="wsp-section-heading">
      <h2>全局仪表盘</h2>
      <p>查看所有已知工作区中的计划任务。</p>
    </div>
  `;

  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "wsp-secondary-button";
  refresh.textContent = busy ? "正在刷新…" : "刷新";
  refresh.disabled = busy;
  refresh.addEventListener("click", () => handlers.onRefresh());
  header.append(refresh);
  section.append(header);

  if (error) {
    const banner = document.createElement("div");
    banner.className = "wsp-banner wsp-banner-error";
    banner.textContent = error;
    section.append(banner);
    return section;
  }

  if (!snapshot) {
    const empty = document.createElement("p");
    empty.textContent = busy ? "正在加载全局仪表盘..." : "尚未加载全局快照。";
    section.append(empty);
    return section;
  }

  const controls = document.createElement("div");
  controls.className = "wsp-global-controls";
  controls.append(
    buildFilterField("状态", "statusFilter", [
      { value: "", label: "所有状态", selected: filters.status === undefined },
      { value: "problem", label: "问题任务", selected: filters.status === "problem" },
      { value: "healthy", label: "健康", selected: filters.status === "healthy" },
      { value: "paused", label: "已暂停", selected: filters.status === "paused" },
      { value: "running", label: "运行中", selected: filters.status === "running" },
      { value: "failed", label: "失败", selected: filters.status === "failed" },
      { value: "missed", label: "已错过", selected: filters.status === "missed" },
      { value: "never_run", label: "从未运行", selected: filters.status === "never_run" }
    ]),
    buildFilterField("工作区", "workspaceFilter", [
      { value: "", label: "所有工作区", selected: filters.workspaceKey === undefined },
      ...snapshot.workspaces.map((workspace) => ({
        value: workspace.workspaceKey,
        label: workspace.workspaceLabel,
        selected: filters.workspaceKey === workspace.workspaceKey
      }))
    ]),
    buildFilterField("排序", "sortBy", [
      { value: "urgency", label: "紧急程度", selected: filters.sortBy === "urgency" },
      { value: "next_run", label: "下次运行", selected: filters.sortBy === "next_run" },
      { value: "workspace", label: "工作区", selected: filters.sortBy === "workspace" },
      { value: "name", label: "名称", selected: filters.sortBy === "name" }
    ])
  );
  section.append(controls);

  const statusSelect = controls.querySelector<HTMLSelectElement>('select[name="statusFilter"]');
  const workspaceSelect = controls.querySelector<HTMLSelectElement>('select[name="workspaceFilter"]');
  const sortSelect = controls.querySelector<HTMLSelectElement>('select[name="sortBy"]');
  statusSelect?.addEventListener("change", () => handlers.onSetStatusFilter(statusSelect.value ? (statusSelect.value as GlobalDashboardStatusFilter) : undefined));
  workspaceSelect?.addEventListener("change", () => handlers.onSetWorkspaceFilter(workspaceSelect.value || undefined));
  sortSelect?.addEventListener("change", () => handlers.onSetSortBy(sortSelect.value as GlobalDashboardSortBy));

  const summary = document.createElement("div");
  summary.className = "wsp-global-summary";
  summary.innerHTML = `
    <div class="wsp-global-card"><strong>${snapshot.summary.totalJobs}</strong><span>任务总数</span></div>
    <div class="wsp-global-card"><strong>${snapshot.summary.activeJobs}</strong><span>活动任务</span></div>
    <div class="wsp-global-card"><strong>${snapshot.summary.pausedJobs}</strong><span>已暂停的任务</span></div>
    <div class="wsp-global-card"><strong>${snapshot.summary.problemJobs}</strong><span>问题任务</span></div>
    <div class="wsp-global-card"><strong>${snapshot.summary.workspacesDegraded}</strong><span>降级工作区</span></div>
  `;
  section.append(summary);
  section.append(renderWorkspaceSummary(snapshot.workspaces));

  if (snapshot.partialData || snapshot.warnings.length) {
    const warning = document.createElement("div");
    warning.className = "wsp-banner wsp-banner-info";
    const title = document.createElement("strong");
    title.textContent = "部分数据";
    warning.append(title);

    const intro = document.createElement("span");
    intro.textContent = snapshot.warnings[0] ?? "一个或多个工作区无法完整读取。";
    warning.append(intro);

    if (snapshot.warnings.length > 1) {
      const list = document.createElement("ul");
      list.className = "wsp-global-warning-list";
      for (const entry of snapshot.warnings) {
        const item = document.createElement("li");
        item.textContent = entry;
        list.append(item);
      }
      warning.append(list);
    }
    section.append(warning);
  }

  if (!snapshot.jobs.length) {
    section.append(emptyState("还没有定时计划", "选择一个项目，点击新增计划开始。"));
    return section;
  }

  const list = document.createElement("ul");
  list.className = "wsp-global-job-list";

  for (const job of snapshot.jobs) {
    const item = document.createElement("li");
    item.className = "wsp-global-job";
    item.dataset.taskId = job.taskId;
    item.dataset.workspaceKey = job.workspaceKey;
    item.dataset.status = job.lastRunStatus;
    item.dataset.workspaceAvailability = job.workspaceAvailability;
    if (isProblemJob(job)) {
      item.setAttribute("data-problem", "true");
    }
    const head = document.createElement("div");
    head.className = "wsp-task-head";

    const titleBlock = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = job.name;
    const workspace = document.createElement("p");
    workspace.textContent = job.workspaceLabel;
    titleBlock.append(title, workspace);

    const status = document.createElement("span");
    status.className = "wsp-status-chip";
    status.textContent = statusLabel(job);
    status.dataset.status = job.lastRunStatus;
    head.append(titleBlock, status);
    item.append(head);

    const meta = document.createElement("div");
    meta.className = "wsp-task-meta";
    appendMeta(meta, job.recurrenceSummary);
    appendMeta(meta, `下次运行： ${formatTime(job.nextRunAt)}`);
    appendMeta(meta, `项目状态：${displayLabel(job.workspaceAvailability)}`);
    appendMeta(meta, `目录：${job.workspacePath}`);
    if (job.lastRunFinishedAt) {
      appendMeta(meta, `上次完成：${formatTime(job.lastRunFinishedAt)}`);
    }
    if (isProblemJob(job)) {
      appendMeta(meta, "需要关注");
    }
    item.append(meta);

    const actions = document.createElement("div");
    actions.className = "wsp-inline-actions";

    const openWorkspace = document.createElement("button");
    openWorkspace.type = "button";
    openWorkspace.dataset.action = "open-workspace";
    openWorkspace.textContent = "打开工作区";
    openWorkspace.disabled = !job.workspaceDrilldownAvailable;
    openWorkspace.addEventListener("click", () => handlers.onOpenWorkspace(job.workspacePath, job.taskId));
    actions.append(openWorkspace);

    for (const action of job.availableActions) {
      const isPending = pendingActionKey === `${job.workspaceKey}:${job.taskId}:${action}`;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = action;
      button.textContent = isPending ? "处理中…" : actionButtonLabel(action);
      button.disabled = busy || isPending || job.workspaceAvailability === "unavailable";
      if (action === "retry" && !job.latestActionableRunId) {
        button.disabled = true;
      }
      button.addEventListener("click", () => {
        switch (action) {
          case "run_now":
            handlers.onRunNow(job.workspaceKey, job.taskId);
            break;
          case "pause":
            handlers.onPause(job.workspaceKey, job.taskId);
            break;
          case "resume":
            handlers.onResume(job.workspaceKey, job.taskId);
            break;
          case "retry":
            if (job.latestActionableRunId) {
              handlers.onRetry(job.workspaceKey, job.taskId, job.latestActionableRunId);
            }
            break;
        }
      });
      actions.append(button);
    }

    item.append(actions);
    list.append(item);
  }

  section.append(list);
  return section;
}
