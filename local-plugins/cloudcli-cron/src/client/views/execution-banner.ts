import { escapeHtml, icon } from "./ui.js";
import type { ExecutionProfileRequest } from "../../shared/contracts.js";
import type { ExecutionCapability, ExecutionProfile } from "../../shared/model.js";

export interface ExecutionBannerHandlers {
  onSave(request: Omit<ExecutionProfileRequest, "workspacePath">): void | Promise<void>;
}

interface ExecutionPreset {
  key: string;
  label: string;
  command: string;
  args: string[];
  timeoutMs: number;
  note: string;
}

const EXECUTION_PRESETS: ExecutionPreset[] = [
  {
    key: "codex",
    label: "Codex",
    command: "codex",
    args: [
      "-a",
      "never",
      "exec",
      "--skip-git-repo-check",
      "--sandbox",
      "workspace-write"
    ],
    timeoutMs: 300000,
    note: "使用 stdin 接收定时提示词。适用于完全本地的 Codex 自动化。"
  },
  {
    key: "claude_code",
    label: "Claude Code",
    command: "claude",
    args: [
      "-p",
      "{{prompt}}",
      "--output-format",
      "text",
      "--dangerously-skip-permissions"
    ],
    timeoutMs: 300000,
    note: "将提示作为直接 CLI 参数发送，并为无头运行禁用权限提示。"
  },
  {
    key: "gemini_cli",
    label: "Gemini CLI",
    command: "gemini",
    args: [
      "-p",
      "{{prompt}}",
      "--output-format",
      "text",
      "--yolo"
    ],
    timeoutMs: 300000,
    note: "以无头模式运行 Gemini，并将提示作为参数传入。"
  }
];

function statusLabel(status: ExecutionCapability["status"]): string {
  switch (status) {
    case "ready":
      return "已就绪";
    case "invalid":
      return "需要操作";
    case "unsupported":
      return "不支持";
    default:
      return "需要配置";
  }
}

function splitArgs(raw: string): string[] {
  return raw
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function presetKeyForProfile(profile: ExecutionProfile | null): string {
  if (!profile) {
    return "";
  }
  const matched = EXECUTION_PRESETS.find((preset) =>
    preset.command === profile.command &&
    preset.timeoutMs === profile.timeoutMs &&
    preset.args.length === profile.args.length &&
    preset.args.every((entry, index) => entry === profile.args[index])
  );
  return matched?.key ?? "";
}

export function renderExecutionBanner(
  capability: ExecutionCapability,
  profile: ExecutionProfile | null,
  handlers: ExecutionBannerHandlers
): HTMLElement {
  const selectedPresetKey = presetKeyForProfile(profile);
  const section = document.createElement("section");
  section.className = `execution-banner status-${capability.status}`;
  section.innerHTML = `
    <details>
    <summary class="wsp-execution-summary">
      <div class="wsp-execution-title">${icon("terminal")}<strong>执行环境</strong><small>${escapeHtml(profile?.command ?? "选择接收提示词的 Agent")}</small></div>
      <div><span class="wsp-status-chip" data-status="${capability.status}">${statusLabel(capability.status)}</span><span class="wsp-chevron">${icon("chevron")}</span></div>
    </summary>
    <div class="wsp-execution-body"><p>${escapeHtml(capability.message)}</p>
    <form class="wsp-form">
      <div class="wsp-field">
        <label for="wsp-exec-preset">预设</label>
        <select id="wsp-exec-preset" name="preset">
          <option value="">自定义</option>
          ${EXECUTION_PRESETS.map((preset) => `<option value="${preset.key}"${selectedPresetKey === preset.key ? " selected" : ""}>${preset.label}</option>`).join("")}
        </select>
        <p>选择预设以预填已知的本地 CLI 配置。</p>
      </div>
      <div class="wsp-form-grid">
        <div class="wsp-field wsp-field-span-2">
          <label for="wsp-exec-command">命令</label>
          <input
            id="wsp-exec-command"
            name="command"
            value="${escapeHtml(profile?.command ?? "")}"
            placeholder="codex"
            required
          >
          <p>在工作区内启动的可执行文件名或绝对路径。</p>
        </div>
        <div class="wsp-field wsp-field-span-2">
          <label for="wsp-exec-args">参数</label>
          <textarea
            id="wsp-exec-args"
            name="args"
            rows="5"
            placeholder="exec&#10;--json"
          >${escapeHtml((profile?.args ?? []).join("\n"))}</textarea>
          <p>每行一个参数。提示始终通过 stdin 发送。可用模板： <code>{{prompt}}</code>, <code>{{workspacePath}}</code>, <code>{{taskName}}</code>, <code>{{taskId}}</code>, <code>{{scheduledFor}}</code>.</p>
        </div>
        <div class="wsp-field">
          <label for="wsp-exec-timeout">超时（毫秒）</label>
          <input
            id="wsp-exec-timeout"
            name="timeoutMs"
            type="number"
            min="1000"
            step="1000"
            value="${profile?.timeoutMs ?? 300000}"
          >
          <p>命令终止前的最大运行时长。</p>
        </div>
      </div>
      <div class="wsp-preview" data-testid="execution-preset-note">
        <strong>${EXECUTION_PRESETS.find((preset) => preset.key === selectedPresetKey)?.label ?? "预设行为"}</strong>
        <div>${EXECUTION_PRESETS.find((preset) => preset.key === selectedPresetKey)?.note ?? "自定义配置。"}</div>
      </div>
      <details class="wsp-preview wsp-runtime-help">
        <summary>高级：提示词传递方式</summary>
        <div>提示会传递给 <code>stdin</code> 除非你的命令或参数包含 <code>{{prompt}}</code>，在这种情况下模板会内联展开。</div>
        <div>环境变量包括 <code>SCHEDULED_PROMPT</code>, <code>SCHEDULED_WORKSPACE_PATH</code>, <code>SCHEDULED_TASK_NAME</code>, <code>SCHEDULED_TASK_ID</code>，以及 <code>SCHEDULED_FOR</code>.</div>
      </details>
      <p class="wsp-feedback" data-execution-feedback role="alert"></p>
      <div class="wsp-form-actions">
        <button type="submit">保存执行设置</button>
      </div>
    </form></div></details>
  `;

  const form = section.querySelector("form");
  const presetSelect = section.querySelector<HTMLSelectElement>('[name="preset"]');
  const commandInput = section.querySelector<HTMLInputElement>('[name="command"]');
  const argsInput = section.querySelector<HTMLTextAreaElement>('[name="args"]');
  const timeoutInput = section.querySelector<HTMLInputElement>('[name="timeoutMs"]');
  const presetNote = section.querySelector<HTMLElement>('[data-testid="execution-preset-note"]');
  if (!form) {
    throw new Error("执行表单渲染失败");
  }
  if (!presetSelect || !commandInput || !argsInput || !timeoutInput || !presetNote) {
    throw new Error("执行预设字段渲染失败");
  }

  const applyPreset = (presetKey: string): void => {
    const preset = EXECUTION_PRESETS.find((entry) => entry.key === presetKey);
    if (!preset) {
      presetNote.innerHTML = "<strong>预设行为</strong><div>自定义配置。</div>";
      return;
    }

    commandInput.value = preset.command;
    argsInput.value = preset.args.join("\n");
    timeoutInput.value = String(preset.timeoutMs);
    presetNote.innerHTML = `<strong>${preset.label}</strong><div>${preset.note}</div>`;
  };

  presetSelect.addEventListener("change", () => {
    applyPreset(presetSelect.value);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const feedback = form.querySelector<HTMLElement>('[data-execution-feedback]');
    if (submit?.disabled) return;
    if (feedback) feedback.textContent = "";
    if (submit) { submit.disabled = true; submit.textContent = "正在保存…"; }
    try {
      await handlers.onSave({
        command: String(formData.get("command") ?? "").trim(),
        args: splitArgs(String(formData.get("args") ?? "")),
        timeoutMs: Number(formData.get("timeoutMs") ?? 300000)
      });
    } catch (error) {
      if (feedback) feedback.textContent = error instanceof Error ? error.message : "保存执行设置失败。";
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = "保存执行设置"; }
    }
  });

  return section;
}
