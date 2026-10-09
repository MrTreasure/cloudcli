import type { ExecutionCapability, ExecutionProfile } from "../shared/model.js";

const LEGACY_CODEX_ARGS = [
  "exec",
  "--skip-git-repo-check",
  "--sandbox",
  "workspace-write",
  "--ask-for-approval",
  "never"
] as const;

const NORMALIZED_CODEX_ARGS = [
  "-a",
  "never",
  "exec",
  "--skip-git-repo-check",
  "--sandbox",
  "workspace-write"
] as const;

function sameArgs(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function createExecutionProfile(input: {
  workspaceKey: string;
  command: string;
  args: string[];
  timeoutMs?: number;
}): ExecutionProfile {
  const command = input.command.trim();
  const args = input.args.map((entry) => entry.trim()).filter(Boolean);
  return {
    workspaceKey: input.workspaceKey,
    command,
    args,
    timeoutMs: input.timeoutMs ?? 300000,
    mode: "local_command",
    lastValidatedAt: new Date().toISOString(),
    validationStatus: command ? "ready" : "invalid"
  };
}

export function normalizeExecutionProfile(profile: ExecutionProfile | null): ExecutionProfile | null {
  if (!profile) {
    return null;
  }

  const command = profile.command.trim();
  const args = profile.args.map((entry) => entry.trim()).filter(Boolean);

  if (command === "codex" && sameArgs(args, LEGACY_CODEX_ARGS)) {
    return {
      ...profile,
      command,
      args: [...NORMALIZED_CODEX_ARGS],
      lastValidatedAt: new Date().toISOString(),
      validationStatus: "ready"
    };
  }

  return {
    ...profile,
    command,
    args
  };
}

export function resolveExecutionCapability(profile: ExecutionProfile | null): ExecutionCapability {
  const normalizedProfile = normalizeExecutionProfile(profile);
  if (!normalizedProfile) {
    return {
      status: "needs_config",
      message: "配置本地执行命令以启用自动提示运行。"
    };
  }

  if (normalizedProfile.mode !== "local_command") {
    return {
      status: "unsupported",
      message: "此部署模式不支持自动执行。"
    };
  }

  if (!normalizedProfile.command) {
    return {
      status: "invalid",
      message: "本地执行设置不完整。"
    };
  }

  return {
    status: "ready",
    message: `本地执行已就绪，通过 "${normalizedProfile.command}".`
  };
}
