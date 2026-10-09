import { displayLabel } from "../shared/labels.js";
import { DateTime } from "luxon";
import type {
  MonthlyRecurrenceDefinition,
  RecurrenceDefinition,
  WeekdayName,
  WorkspaceTask
} from "../shared/model.js";

const WEEKDAY_TO_INDEX: Record<WeekdayName, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7
};

function requireValidZone(timezone: string): void {
  const sample = DateTime.now().setZone(timezone);
  if (!sample.isValid) {
    throw new Error(`无效时区：${timezone}`);
  }
}

function parseLocalTime(localTime: string): { hour: number; minute: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(localTime);
  if (!match) {
    throw new Error("localTime 必须格式化为 HH:mm");
  }

  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function candidateAt(date: any, localTime: string): any {
  const { hour, minute } = parseLocalTime(localTime);
  return date.set({ hour, minute, second: 0, millisecond: 0 });
}

function lastDayOfMonth(year: number, month: number, timezone: string): number {
  return DateTime.fromObject({ year, month, day: 1 }, { zone: timezone }).endOf("month").day;
}

function resolveMonthlyDay(definition: MonthlyRecurrenceDefinition, year: number, month: number): number {
  const maxDay = lastDayOfMonth(year, month, definition.timezone);
  return Math.min(definition.dayOfMonth, maxDay);
}

export function validateRecurrenceDefinition(recurrence: RecurrenceDefinition): void {
  requireValidZone(recurrence.timezone);

  switch (recurrence.scheduleType) {
    case "one_time": {
      const instant = DateTime.fromISO(recurrence.runAt, { zone: "utc" });
      if (!instant.isValid) {
        throw new Error("runAt 必须是有效的 ISO 时间戳");
      }
      return;
    }
    case "daily":
      parseLocalTime(recurrence.localTime);
      return;
    case "weekdays":
      parseLocalTime(recurrence.localTime);
      if (!recurrence.weekdays.length) {
        throw new Error("按星期计划至少需要一个星期几");
      }
      for (const weekday of recurrence.weekdays) {
        if (!(weekday in WEEKDAY_TO_INDEX)) {
          throw new Error(`无效星期：${weekday}`);
        }
      }
      return;
    case "weekly":
      parseLocalTime(recurrence.localTime);
      if (!(recurrence.dayOfWeek in WEEKDAY_TO_INDEX)) {
        throw new Error("每周计划需要有效的 dayOfWeek");
      }
      return;
    case "monthly":
      parseLocalTime(recurrence.localTime);
      if (!Number.isInteger(recurrence.dayOfMonth) || recurrence.dayOfMonth < 1 || recurrence.dayOfMonth > 31) {
        throw new Error("每月计划要求 dayOfMonth 在 1 到 31 之间");
      }
      return;
    default:
      throw new Error("不支持的调度类型");
  }
}

export function nextOccurrenceForRecurrence(
  recurrence: RecurrenceDefinition,
  afterIso: string = new Date().toISOString()
): string | null {
  validateRecurrenceDefinition(recurrence);
  const afterUtc = DateTime.fromISO(afterIso, { zone: "utc" });
  const zoned = afterUtc.setZone(recurrence.timezone);

  switch (recurrence.scheduleType) {
    case "one_time": {
      const runAt = DateTime.fromISO(recurrence.runAt, { zone: "utc" });
      return runAt > afterUtc ? runAt.toUTC().toISO() : null;
    }
    case "daily": {
      let candidate = candidateAt(zoned, recurrence.localTime);
      if (candidate <= zoned) {
        candidate = candidate.plus({ days: 1 });
      }
      return candidate.toUTC().toISO();
    }
    case "weekdays": {
      const allowed = new Set(recurrence.weekdays.map((weekday) => WEEKDAY_TO_INDEX[weekday]));
      for (let offset = 0; offset <= 14; offset += 1) {
        const day = zoned.plus({ days: offset });
        if (!allowed.has(day.weekday)) {
          continue;
        }
        const candidate = candidateAt(day, recurrence.localTime);
        if (candidate > zoned) {
          return candidate.toUTC().toISO();
        }
      }
      return null;
    }
    case "weekly": {
      const targetWeekday = WEEKDAY_TO_INDEX[recurrence.dayOfWeek];
      for (let offset = 0; offset <= 14; offset += 1) {
        const day = zoned.plus({ days: offset });
        if (day.weekday !== targetWeekday) {
          continue;
        }
        const candidate = candidateAt(day, recurrence.localTime);
        if (candidate > zoned) {
          return candidate.toUTC().toISO();
        }
      }
      return null;
    }
    case "monthly": {
      for (let offset = 0; offset <= 24; offset += 1) {
        const monthDate = zoned.plus({ months: offset }).startOf("month");
        const day = resolveMonthlyDay(recurrence, monthDate.year, monthDate.month);
        const candidate = candidateAt(monthDate.set({ day }), recurrence.localTime);
        if (candidate > zoned) {
          return candidate.toUTC().toISO();
        }
      }
      return null;
    }
    default:
      return null;
  }
}

export function formatRecurrenceSummary(recurrence: RecurrenceDefinition): string {
  switch (recurrence.scheduleType) {
    case "one_time":
      return `一次性于 ${DateTime.fromISO(recurrence.runAt, { zone: "utc" })
        .setZone(recurrence.timezone)
        .toFormat("yyyy-LL-dd HH:mm")} (${recurrence.timezone})`;
    case "daily":
      return `每天于 ${recurrence.localTime} (${recurrence.timezone})`;
    case "weekdays":
      return `${recurrence.weekdays.map(displayLabel).join("、")} ${recurrence.localTime} (${recurrence.timezone})`;
    case "weekly":
      return `${displayLabel(recurrence.dayOfWeek)} ${recurrence.localTime} (${recurrence.timezone})`;
    case "monthly":
      return `每月 ${recurrence.dayOfMonth} 日 ${recurrence.localTime} (${recurrence.timezone})`;
    default:
      return "未知重复规则";
  }
}

export function computeTaskNextRun(task: WorkspaceTask, afterIso?: string): string | null {
  if (!task.enabled) {
    return null;
  }
  return nextOccurrenceForRecurrence(task.recurrence, afterIso);
}

export function occurrenceKeyForTask(taskId: string, scheduledFor: string): string {
  return `${taskId}:${scheduledFor}`;
}
