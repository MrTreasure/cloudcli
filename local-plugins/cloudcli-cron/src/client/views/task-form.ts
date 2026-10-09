import { displayLabel } from "../../shared/labels.js";
import type { CreateTaskRequest } from "../../shared/contracts.js";
import type {
  DailyRecurrenceDefinition,
  MonthlyRecurrenceDefinition,
  OneTimeRecurrenceDefinition,
  RecurrenceDefinition,
  ScheduleType,
  WeekdayName,
  WeekdaysRecurrenceDefinition,
  WeeklyRecurrenceDefinition,
  WorkspaceTask
} from "../../shared/model.js";
import { formatRecurrenceSummary, nextOccurrenceForRecurrence, validateRecurrenceDefinition } from "../../server/recurrence.js";

export interface TaskFormHandlers {
  onSubmit(request: Omit<CreateTaskRequest, "workspacePath">): void;
  onCancelEdit(): void;
}

const WEEKDAYS: WeekdayName[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

function titleCase(value: string): string {
  return displayLabel(value);
}

function recurrenceFields(task: WorkspaceTask | null): string {
  const recurrence = task?.recurrence;
  const scheduleType = recurrence?.scheduleType ?? "daily";
  const timezone = recurrence?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTime =
    recurrence &&
    "localTime" in recurrence &&
    typeof recurrence.localTime === "string"
      ? recurrence.localTime
      : "09:00";
  const runAt = recurrence?.scheduleType === "one_time" ? recurrence.runAt : "";
  const weekdays = recurrence?.scheduleType === "weekdays" ? recurrence.weekdays : ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const dayOfWeek = recurrence?.scheduleType === "weekly" ? recurrence.dayOfWeek : "monday";
  const dayOfMonth = recurrence?.scheduleType === "monthly" ? recurrence.dayOfMonth : 1;

  return `
    <div class="wsp-field">
      <label for="wsp-schedule-type">计划类型</label>
      <select id="wsp-schedule-type" name="scheduleType">
        <option value="one_time"${scheduleType === "one_time" ? " selected" : ""}>一次性</option>
        <option value="daily"${scheduleType === "daily" ? " selected" : ""}>每天</option>
        <option value="weekdays"${scheduleType === "weekdays" ? " selected" : ""}>选中的工作日</option>
        <option value="weekly"${scheduleType === "weekly" ? " selected" : ""}>每周</option>
        <option value="monthly"${scheduleType === "monthly" ? " selected" : ""}>每月</option>
      </select>
      <p>选择此提示在当前工作区中运行的时间。</p>
    </div>
    <div class="wsp-field">
      <label for="wsp-timezone">时区</label>
      <input id="wsp-timezone" name="timezone" value="${timezone}" placeholder="Europe/Paris">
      <p>用于计算下次运行的 IANA 时区。</p>
    </div>
    <div class="wsp-field" data-schedule-scope="timed">
      <label for="wsp-local-time">本地时间</label>
      <input id="wsp-local-time" name="localTime" value="${localTime}" placeholder="09:00" inputmode="numeric">
      <p>用于重复计划的 24 小时本地时间。</p>
    </div>
    <div class="wsp-field" data-schedule-scope="one_time">
      <label for="wsp-run-at">运行时间</label>
      <input id="wsp-run-at" name="runAt" value="${runAt}" placeholder="2026-04-26T09:00:00.000Z">
      <p>单次执行的绝对 ISO 时间戳。</p>
    </div>
    <div class="wsp-field wsp-field-span-2" data-schedule-scope="weekdays">
      <label>工作日</label>
      <div class="wsp-checkbox-group">
        ${WEEKDAYS.map((weekday) => `
          <label class="wsp-checkbox">
            <input type="checkbox" name="weekday" value="${weekday}"${weekdays.includes(weekday) ? " checked" : ""}>
            <span>${titleCase(weekday.slice(0, 3))}</span>
          </label>
        `).join("")}
      </div>
      <p>仅在勾选的日期触发此提示。</p>
    </div>
    <div class="wsp-field" data-schedule-scope="weekly">
      <label for="wsp-day-of-week">星期</label>
      <select id="wsp-day-of-week" name="dayOfWeek">
        ${WEEKDAYS.map((weekday) => `
          <option value="${weekday}"${dayOfWeek === weekday ? " selected" : ""}>${titleCase(weekday)}</option>
        `).join("")}
      </select>
      <p>此运行每周在该星期几执行。</p>
    </div>
    <div class="wsp-field" data-schedule-scope="monthly">
      <label for="wsp-day-of-month">每月日期</label>
      <input id="wsp-day-of-month" name="dayOfMonth" value="${dayOfMonth}" type="number" min="1" max="31">
      <p>如果该日在月份中不存在，则钳制到最后一天。</p>
    </div>
  `;
}

function buildRecurrence(formData: FormData): RecurrenceDefinition {
  const scheduleType = String(formData.get("scheduleType") ?? "daily") as ScheduleType;
  const timezone = String(formData.get("timezone") ?? "").trim();
  const localTime = String(formData.get("localTime") ?? "").trim();

  switch (scheduleType) {
    case "one_time":
      return {
        scheduleType,
        timezone,
        runAt: String(formData.get("runAt") ?? "").trim()
      } satisfies OneTimeRecurrenceDefinition;
    case "daily":
      return { scheduleType, timezone, localTime } satisfies DailyRecurrenceDefinition;
    case "weekdays":
      return {
        scheduleType,
        timezone,
        localTime,
        weekdays: formData.getAll("weekday")
          .map((entry) => String(entry).trim())
          .filter(Boolean) as WeekdayName[]
      } satisfies WeekdaysRecurrenceDefinition;
    case "weekly":
      return {
        scheduleType,
        timezone,
        localTime,
        dayOfWeek: String(formData.get("dayOfWeek") ?? "").trim() as WeekdayName
      } satisfies WeeklyRecurrenceDefinition;
    case "monthly":
      return {
        scheduleType,
        timezone,
        localTime,
        dayOfMonth: Number(formData.get("dayOfMonth") ?? 1),
        monthlyOverflowPolicy: "clamp_to_last_day"
      } satisfies MonthlyRecurrenceDefinition;
    default:
      throw new Error("不支持的调度类型");
  }
}

function summarizeDraft(recurrence: RecurrenceDefinition): string {
  const nextRunAt = nextOccurrenceForRecurrence(recurrence);
  return `${formatRecurrenceSummary(recurrence)}${nextRunAt ? ` | 下次运行：${nextRunAt}` : " | 下次运行：不可用"}`;
}

export function renderTaskForm(task: WorkspaceTask | null, handlers: TaskFormHandlers): HTMLElement {
  const section = document.createElement("section");
  section.className = "task-form";
  section.innerHTML = `
    <div class="wsp-section-heading">
      <h2>${task ? "编辑计划" : "创建计划"}</h2>
      <p>${task ? "更新提示词或频率，然后保存调度。" : "为此工作区定义提示、频率和时区。"}</p>
    </div>
    <form class="wsp-form">
      <div class="wsp-panel">
        <div class="wsp-panel-title">提示</div>
        <div class="wsp-field">
          <label for="wsp-name">名称</label>
          <input id="wsp-name" name="name" value="${task?.name ?? ""}" required placeholder="早间摘要">
          <p>计划列表中显示的简短标签。</p>
        </div>
        <div class="wsp-field">
          <label for="wsp-prompt">提示</label>
          <textarea id="wsp-prompt" name="prompt" rows="6" required placeholder="总结工作区并突出显示阻塞项。">${task?.prompt ?? ""}</textarea>
          <p>任务运行时发送的确切提示。</p>
        </div>
      </div>

      <div class="wsp-panel">
        <div class="wsp-panel-title">定时</div>
        <div class="wsp-form-grid">
          ${recurrenceFields(task)}
        </div>
      </div>

      <div class="wsp-panel">
        <div class="wsp-panel-title">验证</div>
        <p class="wsp-feedback" data-testid="task-form-feedback" role="alert"></p>
        <div class="wsp-preview" data-testid="task-form-preview"></div>
        <p class="wsp-preview-note">保存会立即在此工作区中创建或更新任务。</p>
      </div>

      <div class="wsp-form-actions">
        <button type="submit">${task ? "保存计划" : "创建计划"}</button>
        ${task ? "<button type=\"button\" data-testid=\"cancel-edit\" class=\"wsp-secondary-button\">取消</button>" : ""}
      </div>
    </form>
  `;

  const form = section.querySelector("form");
  if (!form) {
    throw new Error("任务表单渲染失败");
  }

  const feedback = section.querySelector<HTMLElement>('[data-testid="task-form-feedback"]');
  const preview = section.querySelector<HTMLElement>('[data-testid="task-form-preview"]');
  const cancel = section.querySelector<HTMLButtonElement>('[data-testid="cancel-edit"]');

  if (!feedback || !preview) {
    throw new Error("任务表单反馈元素渲染失败");
  }

  const syncVisibility = (): void => {
    const scheduleType = String(new FormData(form).get("scheduleType") ?? "daily") as ScheduleType;
    const toggle = (scope: string, visible: boolean): void => {
      form.querySelectorAll<HTMLElement>(`[data-schedule-scope="${scope}"]`).forEach((node) => {
        node.hidden = !visible;
      });
    };

    toggle("timed", scheduleType !== "one_time");
    toggle("one_time", scheduleType === "one_time");
    toggle("weekdays", scheduleType === "weekdays");
    toggle("weekly", scheduleType === "weekly");
    toggle("monthly", scheduleType === "monthly");
  };

  const refreshPreview = (): RecurrenceDefinition | null => {
    syncVisibility();
    feedback.textContent = "";
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const prompt = String(formData.get("prompt") ?? "").trim();

    if (!name || !prompt) {
      preview.textContent = "填写名称和提示以预览此计划。";
      return null;
    }

    try {
      const recurrence = buildRecurrence(formData);
      validateRecurrenceDefinition(recurrence);
      preview.textContent = summarizeDraft(recurrence);
      return recurrence;
    } catch (error) {
      preview.textContent = "预览不可用。";
      feedback.textContent = error instanceof Error ? error.message : "无效计划。";
      return null;
    }
  };

  form.addEventListener("input", () => {
    refreshPreview();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const prompt = String(formData.get("prompt") ?? "").trim();

    if (!name || !prompt) {
      feedback.textContent = "名称和提示为必填项。";
      return;
    }

    const recurrence = refreshPreview();
    if (!recurrence) {
      return;
    }

    handlers.onSubmit({ name, prompt, recurrence });
  });

  cancel?.addEventListener("click", () => handlers.onCancelEdit());
  refreshPreview();

  return section;
}
