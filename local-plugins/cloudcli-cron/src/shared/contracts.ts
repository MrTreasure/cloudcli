import type {
  ExecutionCapability,
  ExecutionProfile,
  GlobalDashboardFilter,
  GlobalDashboardSnapshot,
  RecurrenceDefinition,
  ScheduledRun,
  WorkspaceTask
} from "./model.js";

export interface WorkspaceScopedRequest {
  workspacePath: string;
}

export interface CreateTaskRequest extends WorkspaceScopedRequest {
  name: string;
  prompt: string;
  recurrence: RecurrenceDefinition;
}

export interface UpdateTaskRequest extends WorkspaceScopedRequest {
  name?: string;
  prompt?: string;
  recurrence?: RecurrenceDefinition;
  enabled?: boolean;
}

export interface ExecutionProfileRequest extends WorkspaceScopedRequest {
  command: string;
  args: string[];
  timeoutMs?: number;
}

export interface TaskResponse {
  task: WorkspaceTask;
}

export interface RunResponse {
  run: ScheduledRun;
}

export interface WorkspaceStateResponse {
  capability: ExecutionCapability;
  executionProfile: ExecutionProfile | null;
  tasks: WorkspaceTask[];
  runs: ScheduledRun[];
}

export interface ExecutionProfileResponse {
  capability: ExecutionCapability;
  executionProfile: ExecutionProfile | null;
}

export interface GlobalDashboardRetryRequest {
  runId: string;
}

export interface GlobalDashboardActionResponse {
  task: WorkspaceTask;
  run?: ScheduledRun;
}

export type GlobalDashboardResponse = GlobalDashboardSnapshot;

type UnknownRecord = Record<string, unknown>;

function isObject(input: unknown): input is UnknownRecord {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function readRequiredString(record: UnknownRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} 必须是非空字符串`);
  }
  return value.trim();
}

function readOptionalEnum<T extends string>(
  record: UnknownRecord,
  key: string,
  allowed: readonly T[]
): T | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${key} 必须是以下之一：${allowed.join(", ")}`);
  }
  return value as T;
}

function readOptionalString(record: UnknownRecord, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${key} 必须是字符串`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${key} 提供时必须是非空字符串`);
  }
  return trimmed;
}

export function parseWorkspaceScopedRequest(body: unknown): WorkspaceScopedRequest {
  if (!isObject(body)) {
    throw new Error("请求体必须是对象");
  }
  return { workspacePath: readRequiredString(body, "workspacePath") };
}

export function parseCreateTaskRequest(body: unknown): CreateTaskRequest {
  if (!isObject(body)) {
    throw new Error("请求体必须是对象");
  }
  const workspacePath = readRequiredString(body, "workspacePath");
  const name = readRequiredString(body, "name");
  const prompt = readRequiredString(body, "prompt");
  const recurrence = body.recurrence;

  if (!isObject(recurrence)) {
    throw new Error("recurrence 必须是对象");
  }

  return {
    workspacePath,
    name,
    prompt,
    recurrence: recurrence as unknown as RecurrenceDefinition
  };
}

export function parseUpdateTaskRequest(body: unknown): UpdateTaskRequest {
  if (!isObject(body)) {
    throw new Error("请求体必须是对象");
  }
  const workspacePath = readRequiredString(body, "workspacePath");
  const name = readOptionalString(body, "name");
  const prompt = readOptionalString(body, "prompt");
  const recurrence = body.recurrence;
  const enabled = body.enabled;

  if (enabled !== undefined && typeof enabled !== "boolean") {
    throw new Error("enabled 必须是布尔值");
  }

  if (recurrence !== undefined && !isObject(recurrence)) {
    throw new Error("recurrence 必须是对象");
  }

  return {
    workspacePath,
    name,
    prompt,
    recurrence: recurrence as unknown as RecurrenceDefinition | undefined,
    enabled
  };
}

export function parseExecutionProfileRequest(body: unknown): ExecutionProfileRequest {
  if (!isObject(body)) {
    throw new Error("请求体必须是对象");
  }

  const args = body.args;
  if (!Array.isArray(args) || args.some((entry) => typeof entry !== "string")) {
    throw new Error("args 必须是字符串数组");
  }

  return {
    workspacePath: readRequiredString(body, "workspacePath"),
    command: readRequiredString(body, "command"),
    args: args.map((entry) => entry.trim()),
    timeoutMs:
      body.timeoutMs === undefined
        ? undefined
        : Number.isInteger(body.timeoutMs) && Number(body.timeoutMs) >= 1000
          ? Number(body.timeoutMs)
          : (() => {
              throw new Error("timeoutMs must be an integer >= 1000");
            })()
  };
}

const GLOBAL_STATUS_FILTERS = [
  "healthy",
  "problem",
  "paused",
  "running",
  "failed",
  "missed",
  "never_run"
] as const;

const GLOBAL_SORTS = ["urgency", "next_run", "workspace", "name"] as const;

export function parseGlobalDashboardQuery(searchParams: URLSearchParams): GlobalDashboardFilter {
  const raw: UnknownRecord = {
    status: searchParams.get("status") ?? undefined,
    workspaceKey: searchParams.get("workspaceKey") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined
  };

  return {
    status: readOptionalEnum(raw, "status", GLOBAL_STATUS_FILTERS),
    workspaceKey: readOptionalString(raw, "workspaceKey"),
    sortBy: readOptionalEnum(raw, "sortBy", GLOBAL_SORTS) ?? "urgency"
  };
}

export function parseGlobalDashboardRetryRequest(body: unknown): GlobalDashboardRetryRequest {
  if (!isObject(body)) {
    throw new Error("请求体必须是对象");
  }

  return {
    runId: readRequiredString(body, "runId")
  };
}
