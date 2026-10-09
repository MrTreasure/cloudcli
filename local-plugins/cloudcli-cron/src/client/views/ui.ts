/** Shared presentation helpers for the scheduler header, forms and activity views. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function formatTime(value: string | null | undefined, timezone?: string): string {
  if (!value) return "未安排";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
      ...(timezone ? { timeZone: timezone } : {})
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }
}

const ICON_PATHS: Record<string, string> = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
  history: '<path d="M3 11a9 9 0 1 1 2.8 7M3 4v7h7M12 7v5l3 2"/>',
  terminal: '<path d="m5 7 5 5-5 5M13 17h6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5M12 16h.01"/>'
};

export function icon(name: string): string {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] ?? ICON_PATHS.clock}</svg>`;
}

export function emptyState(title: string, description: string, symbol = "calendar"): HTMLElement {
  const element = document.createElement("div");
  element.className = "wsp-empty";
  element.innerHTML = `<span class="wsp-empty-icon">${icon(symbol)}</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p>`;
  return element;
}
