import type { CreateTaskRequest, GlobalDashboardActionResponse, UpdateTaskRequest } from "../shared/contracts.js";
import type { GlobalDashboardFilter, GlobalJobRunStatus, WorkspaceTask } from "../shared/model.js";
import type { PluginAPI } from "../types.js";
import { PluginRpcClient } from "./api.js";
import { AppStateStore, DEFAULT_CAPABILITY } from "./state.js";
import { renderExecutionBanner } from "./views/execution-banner.js";
import { renderGlobalDashboard } from "./views/global-dashboard.js";
import { renderRunHistory } from "./views/run-history.js";
import { renderScheduleList } from "./views/schedule-list.js";
import { renderTaskForm } from "./views/task-form.js";
import { ensureStyles } from "./styles.js";
import { escapeHtml, formatTime, icon } from "./views/ui.js";

const GLOBAL_REFRESH_INTERVAL_MS = 60_000;

function normalizeGlobalRunStatus(
  status: WorkspaceTask["lastRunStatus"],
  fallback: GlobalJobRunStatus
): GlobalJobRunStatus {
  switch (status) {
    case "running":
    case "succeeded":
    case "failed":
    case "missed":
      return status;
    default:
      return fallback;
  }
}

function renderBanner(kind: "error" | "success" | "info", title: string, message: string): HTMLElement {
  const banner = document.createElement("div");
  banner.className = `wsp-banner wsp-banner-${kind}`;
  banner.setAttribute("role", kind === "error" ? "alert" : "status");
  banner.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  return banner;
}

export class WorkspaceScheduledPromptsApp {
  private readonly rpc: PluginRpcClient;
  private readonly state = new AppStateStore();
  private unsubscribe: (() => void) | null = null;
  private editorOpen = false;
  private taskForm: HTMLElement | null = null;
  private taskFormKey: string | null = null;
  private executionSettingsOpen: boolean | null = null;
  private executionElement: HTMLElement | null = null;
  private executionKey: string | null = null;
  private globalRefreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly container: HTMLElement, private readonly api: PluginAPI) {
    this.rpc = new PluginRpcClient(api);
  }

  async mount(): Promise<void> {
    ensureStyles();
    this.unsubscribe = this.state.subscribe(() => this.render());
    this.state.patch({
      activeTab: this.api.context.project?.path ? "workspace" : "global"
    });
    await Promise.all([
      this.loadFromContext(this.api.context.project?.path ?? null),
      this.loadGlobalDashboard()
    ]);
    this.startGlobalRefreshTimer();
  }

  unmount(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.globalRefreshTimer) {
      clearInterval(this.globalRefreshTimer);
      this.globalRefreshTimer = null;
    }
    this.container.innerHTML = "";
  }

  private startGlobalRefreshTimer(): void {
    if (this.globalRefreshTimer) {
      return;
    }
    this.globalRefreshTimer = setInterval(() => {
      if (this.state.snapshot.activeTab !== "global") {
        return;
      }
      void this.loadGlobalDashboard(true);
    }, GLOBAL_REFRESH_INTERVAL_MS);
  }

  private async loadGlobalDashboard(silent = false): Promise<boolean> {
    if (!silent) {
      this.state.patch({ globalBusy: true, globalError: null });
    }

    try {
      const snapshot = await this.rpc.loadGlobalDashboard(this.state.snapshot.globalFilters);
      this.state.patch({
        globalSnapshot: snapshot,
        globalBusy: false,
        globalError: null
      });
      return true;
    } catch (error) {
      this.state.patch({
        globalBusy: false,
        globalError: error instanceof Error ? error.message : "加载全局仪表盘失败。"
      });
      return false;
    }
  }

  private updateGlobalSnapshotFromAction(response: GlobalDashboardActionResponse): void {
    const snapshot = this.state.snapshot.globalSnapshot;
    if (!snapshot) {
      return;
    }

    const jobs = snapshot.jobs.map((job) => {
      if (job.workspaceKey !== response.task.workspaceKey || job.taskId !== response.task.id) {
        return job;
      }

      return {
        ...job,
        name: response.task.name,
        workspacePath: response.task.workspacePath,
        enabled: response.task.enabled,
        nextRunAt: response.task.nextRunAt,
        lastRunStatus: normalizeGlobalRunStatus(response.task.lastRunStatus, job.lastRunStatus),
        lastRunFinishedAt: response.run?.finishedAt ?? job.lastRunFinishedAt
      };
    });

    this.state.patch({
      globalSnapshot: {
        ...snapshot,
        jobs
      }
    });
  }

  private async focusWorkspace(workspacePath: string, taskId: string | null = null): Promise<void> {
    const loaded = await this.loadFromContext(workspacePath);
    await this.loadGlobalDashboard(true);
    if (!loaded) {
      return;
    }

    this.state.patch({
      activeTab: "workspace",
      error: null,
      successMessage: null,
      globalError: null,
      highlightedTaskId: taskId
    });
  }

  private async dispatchGlobalAction(
    action: "run_now" | "pause" | "resume" | "retry",
    workspaceKey: string,
    taskId: string,
    runId?: string
  ): Promise<void> {
    this.state.patch({
      globalPendingActionKey: `${workspaceKey}:${taskId}:${action}`,
      error: null,
      successMessage: null,
      globalError: null
    });

    try {
      let response: GlobalDashboardActionResponse;
      switch (action) {
        case "run_now":
          response = await this.rpc.globalRunNow(workspaceKey, taskId);
          break;
        case "pause":
          response = await this.rpc.globalPauseTask(workspaceKey, taskId);
          break;
        case "resume":
          response = await this.rpc.globalResumeTask(workspaceKey, taskId);
          break;
        case "retry":
          if (!runId) {
            throw new Error("缺少重试目标。");
          }
          response = await this.rpc.globalRetryTask(workspaceKey, taskId, { runId });
          break;
      }

      this.updateGlobalSnapshotFromAction(response);
      if (this.state.snapshot.workspacePath === response.task.workspacePath) {
        const refreshed = await this.loadFromContext(response.task.workspacePath);
        if (refreshed) {
          this.state.patch({ highlightedTaskId: response.task.id });
        }
      }
      await this.loadGlobalDashboard(true);
      const messageByAction: Record<typeof action, string> = {
        run_now: `手动运行已完成 "${response.task.name}".`,
        pause: `已暂停“${response.task.name}”`,
        resume: `已恢复“${response.task.name}”`,
        retry: `重试已完成 "${response.task.name}".`
      };
      this.state.patch({
        successMessage: messageByAction[action],
        error: null
      });
    } catch (error) {
      this.state.patch({
        error: error instanceof Error ? error.message : "执行全局操作失败。",
        successMessage: null
      });
    } finally {
      this.state.patch({ globalPendingActionKey: null });
    }
  }

  private async updateGlobalFilters(
    patch: Partial<GlobalDashboardFilter>
  ): Promise<void> {
    const nextFilters = {
      ...this.state.snapshot.globalFilters,
      ...patch
    };
    this.state.patch({
      globalFilters: nextFilters,
      globalError: null
    });
    await this.loadGlobalDashboard();
  }

  async loadFromContext(workspacePath: string | null): Promise<boolean> {
    if (workspacePath !== this.state.snapshot.workspacePath) {
      this.editorOpen = false;
      this.taskForm = null;
      this.taskFormKey = null;
      this.executionSettingsOpen = null;
      this.executionElement = null;
      this.executionKey = null;
    }
    if (!workspacePath) {
      this.state.replace({
        activeTab: "global",
        workspacePath: null,
        tasks: [],
        runs: [],
        capability: DEFAULT_CAPABILITY,
        executionProfile: null,
        busy: false,
        error: null,
        successMessage: null,
        editingTaskId: null,
        highlightedTaskId: null,
        globalSnapshot: this.state.snapshot.globalSnapshot,
        globalFilters: this.state.snapshot.globalFilters,
        globalBusy: this.state.snapshot.globalBusy,
        globalError: this.state.snapshot.globalError,
        globalPendingActionKey: this.state.snapshot.globalPendingActionKey
      });
      return true;
    }

    this.state.patch({
      busy: true,
      workspacePath,
      error: null,
      successMessage: null,
      highlightedTaskId: null
    });
    try {
      const payload = await this.rpc.loadWorkspaceState(workspacePath);
      this.state.patch({
        workspacePath,
        tasks: payload.tasks,
        runs: payload.runs,
        capability: payload.capability,
        executionProfile: payload.executionProfile,
        busy: false,
        error: null,
        successMessage: null,
        highlightedTaskId: null
      });
      return true;
    } catch (error) {
      this.state.patch({
        busy: false,
        error: error instanceof Error ? error.message : "加载工作区状态失败。",
        executionProfile: null,
        successMessage: null
      });
      return false;
    }
  }

  private currentEditingTask(): WorkspaceTask | null {
    const { editingTaskId, tasks } = this.state.snapshot;
    return tasks.find((task) => task.id === editingTaskId) ?? null;
  }

  private async reconcileWorkspaceState(
    workspacePath: string,
    successMessage: string,
    highlightedTaskId: string | null
  ): Promise<void> {
    const refreshed = await this.loadFromContext(workspacePath);
    await this.loadGlobalDashboard(true);
    if (!refreshed) {
      return;
    }
    this.state.patch({
      successMessage,
      highlightedTaskId,
      error: null
    });
  }

  private async handleCreateTask(request: Omit<CreateTaskRequest, "workspacePath">): Promise<void> {
    const workspacePath = this.state.snapshot.workspacePath;
    if (!workspacePath) {
      return;
    }

    const response = await this.rpc.createTask({ ...request, workspacePath });
    this.editorOpen = false;
    this.taskForm = null;
    this.state.upsertTask(response.task);
    this.state.patch({
      editingTaskId: null,
      error: null,
      successMessage: `已创建“${response.task.name}”`,
      highlightedTaskId: response.task.id
    });
    await this.loadGlobalDashboard(true);
  }

  private async handleSaveTask(request: Omit<CreateTaskRequest, "workspacePath">): Promise<void> {
    const workspacePath = this.state.snapshot.workspacePath;
    const editingTaskId = this.state.snapshot.editingTaskId;
    if (!workspacePath) {
      return;
    }

    if (!editingTaskId) {
      await this.handleCreateTask(request);
      return;
    }

    const update: UpdateTaskRequest = {
      workspacePath,
      name: request.name,
      prompt: request.prompt,
      recurrence: request.recurrence
    };
    const response = await this.rpc.updateTask(editingTaskId, update);
    this.editorOpen = false;
    this.taskForm = null;
    this.state.upsertTask(response.task);
    this.state.patch({
      editingTaskId: null,
      error: null,
      successMessage: `已更新“${response.task.name}”`,
      highlightedTaskId: response.task.id
    });
    await this.loadGlobalDashboard(true);
  }

  private render(): void {
    const snapshot = this.state.snapshot;
    const focused = this.container.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
    const restoreFocus = (root: HTMLElement) => {
      if (!focused) return;
      const target = root.contains(focused) ? focused
        : focused.id ? root.querySelector<HTMLElement>(`#${CSS.escape(focused.id)}`)
        : focused.getAttribute("name") ? root.querySelector<HTMLElement>(`[name="${CSS.escape(focused.getAttribute("name")!)}"]`) : null;
      target?.focus({ preventScroll: true });
    };
    this.container.innerHTML = "";

    const root = document.createElement("div");
    root.className = "workspace-scheduled-prompts";
    root.dataset.theme = this.api.context.theme;

    const shell = document.createElement("div");
    shell.className = "wsp-shell";
    root.append(shell);
    const heading = document.createElement("header");
    heading.className = "wsp-header";
    heading.innerHTML = `<div class="wsp-header-heading"><span class="wsp-heading-icon">${icon("clock")}</span><div><h1>定时提示词</h1><p>把重复的工作交给计划，让 Agent 按时执行。</p></div></div>`;
    const headerActions = document.createElement("div");
    headerActions.className = "wsp-header-actions";
    const create = document.createElement("button");
    create.type = "button";
    create.id = "wsp-create-plan";
    create.className = "wsp-primary-button";
    create.disabled = !snapshot.workspacePath || snapshot.busy;
    create.innerHTML = `${icon("plus")}新增计划`;
    create.addEventListener("click", () => {
      this.editorOpen = true;
      this.taskForm = null;
      this.state.patch({ activeTab: "workspace", editingTaskId: null, error: null, successMessage: null });
      this.container.querySelector<HTMLInputElement>("#wsp-name")?.focus();
    });
    headerActions.append(create);
    heading.append(headerActions);
    shell.append(heading);
    const toolbar = document.createElement("div");
    toolbar.className = "wsp-toolbar";
    const tabs = document.createElement("div");
    tabs.className = "wsp-tabs";
    const globalTab = document.createElement("button");
    globalTab.type = "button";
    globalTab.id = "wsp-tab-global";
    globalTab.className = "wsp-tab";
    globalTab.dataset.active = String(snapshot.activeTab === "global");
    globalTab.textContent = "全部项目";
    globalTab.setAttribute("aria-pressed", String(snapshot.activeTab === "global"));
    globalTab.addEventListener("click", () => {
      this.state.patch({ activeTab: "global", error: null, successMessage: null });
      void this.loadGlobalDashboard();
    });
    tabs.append(globalTab);

    const workspaceTab = document.createElement("button");
    workspaceTab.type = "button";
    workspaceTab.id = "wsp-tab-workspace";
    workspaceTab.className = "wsp-tab";
    workspaceTab.dataset.active = String(snapshot.activeTab === "workspace");
    workspaceTab.textContent = "当前项目";
    workspaceTab.setAttribute("aria-pressed", String(snapshot.activeTab === "workspace"));
    workspaceTab.disabled = !snapshot.workspacePath;
    workspaceTab.addEventListener("click", () => {
      this.state.patch({ activeTab: "workspace", error: null, successMessage: null });
    });
    tabs.append(workspaceTab);
    toolbar.append(tabs);
    const projectPath = document.createElement("span");
    projectPath.className = "wsp-workspace-chip";
    projectPath.textContent = snapshot.activeTab === "global" ? "所有已保存的项目计划" : snapshot.workspacePath ?? "请选择项目";
    projectPath.title = snapshot.workspacePath ?? "";
    toolbar.append(projectPath);
    shell.append(toolbar);

    if (snapshot.error) {
      shell.append(renderBanner("error", "需要操作", snapshot.error));
    }

    if (snapshot.successMessage) {
      const success = renderBanner("success", "已保存", snapshot.successMessage);
      success.setAttribute("role", "status");
      success.setAttribute("aria-live", "polite");
      shell.append(success);
    }

    if (snapshot.busy) {
      shell.append(renderBanner("info", "加载中", "正在刷新工作区计划和运行历史。"));
    }

    const main = document.createElement("div");
    main.className = "wsp-main";

    if (snapshot.activeTab === "global") {
      main.style.gridTemplateColumns = "minmax(0, 1fr)";
      main.append(
        renderGlobalDashboard(
          snapshot.globalSnapshot,
          snapshot.globalBusy,
          snapshot.globalError,
          snapshot.globalFilters,
          {
            onRefresh: () => {
              void this.loadGlobalDashboard();
            },
            onSetStatusFilter: (status) => {
              void this.updateGlobalFilters({ status });
            },
            onSetWorkspaceFilter: (workspaceKey) => {
              void this.updateGlobalFilters({ workspaceKey });
            },
            onSetSortBy: (sortBy) => {
              void this.updateGlobalFilters({ sortBy });
            },
            onOpenWorkspace: (workspacePath, taskId) => {
              void this.focusWorkspace(workspacePath, taskId);
            },
            onRunNow: (workspaceKey, taskId) => {
              void this.dispatchGlobalAction("run_now", workspaceKey, taskId);
            },
            onPause: (workspaceKey, taskId) => {
              void this.dispatchGlobalAction("pause", workspaceKey, taskId);
            },
            onResume: (workspaceKey, taskId) => {
              void this.dispatchGlobalAction("resume", workspaceKey, taskId);
            },
            onRetry: (workspaceKey, taskId, runId) => {
              void this.dispatchGlobalAction("retry", workspaceKey, taskId, runId);
            }
          },
          snapshot.globalPendingActionKey
        )
      );
      shell.append(main);
      this.container.append(root);
      restoreFocus(root);
      return;
    }

    const upcoming = snapshot.tasks.filter(task => task.enabled && task.nextRunAt)
      .sort((a, b) => Date.parse(a.nextRunAt!) - Date.parse(b.nextRunAt!))[0];
    const stats = document.createElement("div");
    stats.className = "wsp-stats";
    stats.innerHTML = `
      <div class="wsp-stat"><span class="wsp-stat-label">${icon("calendar")}计划总数</span><strong>${snapshot.tasks.length}</strong><small>当前项目</small></div>
      <div class="wsp-stat"><span class="wsp-stat-label">${icon("play")}已启用</span><strong>${snapshot.tasks.filter(task => task.enabled).length}</strong><small>按计划自动执行</small></div>
      <div class="wsp-stat"><span class="wsp-stat-label">${icon("alert")}需要关注</span><strong>${snapshot.tasks.filter(task => task.lastRunStatus === "failed" || task.lastRunStatus === "missed").length}</strong><small>失败或错过的执行</small></div>
      <div class="wsp-stat"><span class="wsp-stat-label">${icon("clock")}下次执行</span><strong class="wsp-stat-time">${escapeHtml(formatTime(upcoming?.nextRunAt, upcoming?.recurrence.timezone))}</strong><small>${escapeHtml(upcoming ? upcoming.name + " · " + upcoming.recurrence.timezone : "创建计划后显示")}</small></div>`;
    shell.append(stats);
    const left = document.createElement("div");
    left.className = "wsp-stack";
    if (this.editorOpen || snapshot.editingTaskId) {
      const key = `${snapshot.workspacePath}:${snapshot.editingTaskId ?? "new"}`;
      if (!this.taskForm || this.taskFormKey !== key) {
        this.taskFormKey = key;
        this.taskForm = renderTaskForm(this.currentEditingTask(), {
          onSubmit: request => this.handleSaveTask(request),
          onCancelEdit: () => {
            this.editorOpen = false;
            this.taskForm = null;
            this.state.patch({ editingTaskId: null, error: null, successMessage: null });
          }
        });
      }
      // Keep the editor DOM so background refreshes preserve the draft.
      shell.append(this.taskForm);
    }
    const right = document.createElement("div");
    right.className = "wsp-stack";
    const executionKey = JSON.stringify([snapshot.workspacePath, snapshot.executionProfile, snapshot.capability]);
    if (!this.executionElement || this.executionKey !== executionKey) {
      this.executionKey = executionKey;
      this.executionElement = renderExecutionBanner(snapshot.capability, snapshot.executionProfile, {
        onSave: (request) => {
          const workspacePath = this.state.snapshot.workspacePath;
          if (!workspacePath) {
            return;
          }
          return this.rpc.saveExecutionProfile({ ...request, workspacePath }).then((response) => {
            this.state.patch({
              capability: response.capability,
              executionProfile: response.executionProfile,
              error: null,
              successMessage: "执行设置已保存。",
              highlightedTaskId: null
            });
          }).catch((error) => {
            this.state.patch({
              error: error instanceof Error ? error.message : "保存执行设置失败。",
              successMessage: null
            });
            throw error;
          });
        }
      });
    }
    const execution = this.executionElement;
    const executionDetails = execution.querySelector("details");
    if (executionDetails) {
      if (this.executionSettingsOpen !== null) executionDetails.open = this.executionSettingsOpen;
      executionDetails.ontoggle = () => { this.executionSettingsOpen = executionDetails.open; };
    }
    shell.append(execution);
    left.append(
      renderScheduleList(snapshot.tasks, {
        onCreate: () => create.click(),
        onEdit: (taskId) => {
          this.editorOpen = true;
          this.state.patch({
          editingTaskId: taskId,
          error: null,
          successMessage: null,
          highlightedTaskId: taskId
          });
          this.container.querySelector<HTMLInputElement>("#wsp-name")?.focus();
        },
        onDelete: (taskId) => {
          const workspacePath = this.state.snapshot.workspacePath;
          if (!workspacePath) {
            return;
          }
          void this.rpc.deleteTask(taskId, workspacePath).then(() => {
            if (this.state.snapshot.editingTaskId === taskId) {
              this.state.patch({ editingTaskId: null });
            }
            return this.reconcileWorkspaceState(workspacePath, "计划已删除。", null);
          }).catch((error) => {
            this.state.patch({
              error: error instanceof Error ? error.message : "删除任务失败。",
              successMessage: null
            });
          });
        },
        onPause: (taskId) => {
          const workspacePath = this.state.snapshot.workspacePath;
          if (!workspacePath) {
            return;
          }
          void this.rpc.pauseTask(taskId, workspacePath).then((response) => {
            return this.reconcileWorkspaceState(workspacePath, `已暂停“${response.task.name}”`, response.task.id);
          }).catch((error) => {
            this.state.patch({
              error: error instanceof Error ? error.message : "暂停任务失败。",
              successMessage: null
            });
          });
        },
        onResume: (taskId) => {
          const workspacePath = this.state.snapshot.workspacePath;
          if (!workspacePath) {
            return;
          }
          void this.rpc.resumeTask(taskId, workspacePath).then((response) => {
            return this.reconcileWorkspaceState(workspacePath, `已恢复“${response.task.name}”`, response.task.id);
          }).catch((error) => {
            this.state.patch({
              error: error instanceof Error ? error.message : "恢复任务失败。",
              successMessage: null
            });
          });
        },
        onDuplicate: (taskId) => {
          const workspacePath = this.state.snapshot.workspacePath;
          if (!workspacePath) {
            return;
          }
          void this.rpc.duplicateTask(taskId, workspacePath).then((response) => {
            return this.reconcileWorkspaceState(workspacePath, `已复制“${response.task.name}”`, response.task.id);
          }).catch((error) => {
            this.state.patch({
              error: error instanceof Error ? error.message : "复制任务失败。",
              successMessage: null
            });
          });
        },
        onRunNow: (taskId) => {
          const workspacePath = this.state.snapshot.workspacePath;
          if (!workspacePath) {
            return;
          }
          void this.rpc.runNow(taskId, workspacePath).then((response) => {
            this.state.patch({
              runs: [response.run, ...this.state.snapshot.runs.filter((run) => run.id !== response.run.id)],
              error: null
            });
            return this.reconcileWorkspaceState(workspacePath, "手动运行已完成。", taskId);
          }).catch((error) => {
            this.state.patch({
              error: error instanceof Error ? error.message : "启动手动运行失败。",
              successMessage: null
            });
          });
        }
      }, snapshot.highlightedTaskId)
    );
    right.append(renderRunHistory(snapshot.runs, {
      onRetry: (runId) => {
        const workspacePath = this.state.snapshot.workspacePath;
        if (!workspacePath) {
          return;
        }
        void this.rpc.retryRun(runId, workspacePath).then((response) => {
          this.state.patch({
            runs: [response.run, ...this.state.snapshot.runs.filter((run) => run.id !== response.run.id)],
            error: null
          });
          return this.reconcileWorkspaceState(workspacePath, "重试已完成。", null);
        }).catch((error) => {
          this.state.patch({
            error: error instanceof Error ? error.message : "重试运行失败。",
            successMessage: null
          });
        });
      }
    }, new Map(snapshot.tasks.map(task => [task.id, task.name]))));
    main.append(left, right);
    shell.append(main);

    this.container.append(root);
    restoreFocus(root);
  }
}
