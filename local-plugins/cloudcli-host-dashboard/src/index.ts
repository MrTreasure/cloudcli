import type { ResourceSnapshot, DiskUsage } from './metrics.js';

type PluginAPI = {
  context: { theme: 'light' | 'dark' };
  onContextChange(callback: (context: { theme: 'light' | 'dark' }) => void): () => void;
  rpc(method: string, path: string): Promise<unknown>;
};

const cleanups = new WeakMap<HTMLElement, () => void>();

const icon = (kind: 'cpu' | 'memory' | 'disk' | 'refresh') => {
  const paths = {
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4"/>',
    memory: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4m4-4v4m4-4v4m4-4v4M7 18v3m5-3v3m5-3v3"/>',
    disk: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 14h18M7 17h.01M17 17h.01"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>',
  };
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
};

const styles = `
.hd-root{--hd-bg:#f5f7fb;--hd-card:#fff;--hd-text:#172335;--hd-muted:#52637a;--hd-line:#dce5f0;--hd-blue:#2563eb;--hd-green:#16845a;--hd-amber:#b76b08;min-height:100%;height:100%;overflow:auto;box-sizing:border-box;background:var(--hd-bg);color:var(--hd-text);font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.hd-root[data-theme="dark"]{--hd-bg:#101722;--hd-card:#182231;--hd-text:#f2f6fb;--hd-muted:#b1bfd0;--hd-line:#354458;--hd-blue:#74a8ff;--hd-green:#65d7a3;--hd-amber:#ffc078}
.hd-root *{box-sizing:border-box}.hd-shell{max-width:1200px;margin:0 auto;padding:28px clamp(16px,3vw,40px) 48px}.hd-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:28px}.hd-kicker{display:flex;align-items:center;gap:9px;color:var(--hd-green);font-size:12px;font-weight:700;letter-spacing:.08em}.hd-dot{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 0 4px color-mix(in srgb,currentColor 15%,transparent)}.hd-title{margin:8px 0 2px;font-size:clamp(24px,3vw,34px);line-height:1.2;letter-spacing:-.035em}.hd-subtitle{margin:0;color:var(--hd-muted);font-size:13px}.hd-actions{display:flex;align-items:center;gap:12px}.hd-time{color:var(--hd-muted);font-size:12px;white-space:nowrap}.hd-refresh{display:grid;place-items:center;width:44px;height:44px;flex:none;color:var(--hd-text);background:var(--hd-card);border:1px solid var(--hd-line);border-radius:12px;cursor:pointer}.hd-refresh:hover{border-color:var(--hd-blue);color:var(--hd-blue)}.hd-refresh:focus-visible{outline:3px solid var(--hd-blue);outline-offset:2px}.hd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.hd-card{min-width:0;background:var(--hd-card);border:1px solid var(--hd-line);border-radius:20px;padding:22px;box-shadow:0 8px 28px rgba(10,20,40,.04)}.hd-card-head{display:flex;align-items:center;gap:10px;color:var(--hd-muted);font-size:13px;font-weight:650}.hd-card-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:color-mix(in srgb,var(--hd-blue) 11%,transparent);color:var(--hd-blue)}.hd-number{margin:19px 0 4px;font-size:clamp(33px,4vw,47px);font-weight:750;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.045em}.hd-number small{margin-left:4px;font-size:.48em;font-weight:600;color:var(--hd-muted)}.hd-meta{min-height:20px;color:var(--hd-muted);font-size:13px}.hd-track{height:9px;margin-top:21px;background:var(--hd-line);border-radius:999px;overflow:hidden}.hd-fill{height:100%;width:0;background:var(--hd-blue);border-radius:inherit;transition:width .35s ease}.hd-memory .hd-fill{background:var(--hd-green)}.hd-disk .hd-fill{background:var(--hd-amber)}.hd-spark{display:block;width:100%;height:42px;margin-top:11px;overflow:visible}.hd-spark polyline{fill:none;stroke:var(--hd-blue);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.hd-volumes{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;min-width:0;margin-top:20px}.hd-volume{min-width:0;max-width:100%}.hd-volume-top{display:grid;grid-template-columns:minmax(0,1fr) max-content;align-items:baseline;gap:8px}.hd-volume-name{font-weight:650;font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hd-volume-percent{font:700 16px/1 ui-monospace,SFMono-Regular,monospace;white-space:nowrap}.hd-volume-path{min-width:0;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--hd-muted);font-size:12px}.hd-volume-detail{margin-top:5px;color:var(--hd-muted);font-size:12px;overflow-wrap:anywhere}.hd-volume-track{width:100%;max-width:100%;height:7px;margin-top:8px;background:var(--hd-line);border-radius:999px;overflow:hidden}.hd-volume-track span{display:block;height:100%;background:var(--hd-amber);border-radius:inherit}.hd-alert{margin-top:18px;padding:12px 14px;border:1px solid var(--hd-amber);border-radius:12px;color:var(--hd-text);font-size:13px}.hd-foot{margin-top:18px;color:var(--hd-muted);font-size:12px}.hd-root [hidden]{display:none!important}
@media(max-width:900px){.hd-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hd-disk{grid-column:1/-1}}
@media(max-width:600px){.hd-shell{padding:20px 16px 40px}.hd-head{align-items:flex-start}.hd-time{display:none}.hd-grid{grid-template-columns:1fr}.hd-disk{grid-column:auto}.hd-card{padding:19px}.hd-number{font-size:39px}}
@media(prefers-reduced-motion:reduce){.hd-fill{transition:none}}
`;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return '—';
  const units = ['B', 'GB', 'TB', 'PB'];
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  const exponent = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)) - 2);
  return `${(bytes / 1024 ** (exponent + 2)).toFixed(1)} ${units[exponent]}`;
}

function setText(root: HTMLElement, selector: string, value: string): void {
  const node = root.querySelector<HTMLElement>(selector);
  if (node) node.textContent = value;
}

function setBar(root: HTMLElement, selector: string, percentage: number): void {
  const node = root.querySelector<HTMLElement>(selector);
  if (node) {
    node.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    node.parentElement?.setAttribute('aria-valuenow', percentage.toFixed(1));
  }
}

function renderDisks(root: HTMLElement, disks: DiskUsage[]): void {
  const list = root.querySelector<HTMLElement>('[data-volumes]');
  if (!list) return;
  list.replaceChildren();
  for (const disk of disks) {
    const volume = document.createElement('div');
    volume.className = 'hd-volume';
    const top = document.createElement('div');
    top.className = 'hd-volume-top';
    const label = document.createElement('span');
    label.className = 'hd-volume-name';
    label.textContent = disk.label;
    label.title = disk.label;
    const percent = document.createElement('span');
    percent.className = 'hd-volume-percent';
    percent.textContent = `${disk.percentage.toFixed(1)}%`;
    top.append(label, percent);
    const mountPath = document.createElement('div');
    mountPath.className = 'hd-volume-path';
    mountPath.textContent = disk.mount;
    mountPath.title = disk.mount;
    const detail = document.createElement('div');
    detail.className = 'hd-volume-detail';
    detail.textContent = `已使用 ${formatBytes(disk.used)} / ${formatBytes(disk.total)} · 可用 ${formatBytes(disk.available)}`;
    const track = document.createElement('div');
    track.className = 'hd-volume-track';
    const fill = document.createElement('span');
    fill.style.width = `${Math.max(0, Math.min(100, disk.percentage))}%`;
    track.append(fill);
    volume.append(top, mountPath, detail, track);
    list.append(volume);
  }
  if (disks.length === 0) setText(root, '[data-disk-state]', '本机磁盘信息不可用');
  else setText(root, '[data-disk-state]', `已发现 ${disks.length} 个卷`);
}

function renderSnapshot(root: HTMLElement, snapshot: ResourceSnapshot, history: number[]): void {
  const cpu = snapshot.cpu.percentage;
  const memory = snapshot.memory.percentage;
  setText(root, '[data-platform]', `${snapshot.host.platform} · ${snapshot.host.processor}`);
  setText(root, '[data-time]', new Date(snapshot.capturedAt).toLocaleTimeString('zh-CN', { hour12: false }));
  setText(root, '[data-cpu]', cpu.toFixed(1));
  setText(root, '[data-cpu-detail]', `${snapshot.cpu.cores} 个逻辑核心 · 1 分钟负载 ${snapshot.cpu.loadOneMinute.toFixed(2)}`);
  setText(root, '[data-memory]', memory.toFixed(1));
  setText(root, '[data-memory-detail]', `已使用 ${formatBytes(snapshot.memory.used)} / ${formatBytes(snapshot.memory.total)}`);
  setBar(root, '[data-cpu-bar]', cpu);
  setBar(root, '[data-memory-bar]', memory);
  history.push(cpu);
  if (history.length > 30) history.shift();
  const points = history.map((value, index) => `${history.length === 1 ? 0 : index * 120 / (history.length - 1)},${36 - value * .32}`).join(' ');
  root.querySelector('polyline')?.setAttribute('points', points);
  renderDisks(root, snapshot.disks);
}

/** CloudCLI tab entry: polls authenticated host metrics and cleans up on tab exit. */
export function mount(container: HTMLElement, api: PluginAPI): void {
  const root = document.createElement('div');
  root.className = 'hd-root';
  root.dataset.theme = api.context.theme;
  root.innerHTML = `<style>${styles}</style><main class="hd-shell">
    <header class="hd-head"><div><div class="hd-kicker"><span class="hd-dot"></span>主机实时监控</div><h1 class="hd-title">仪表盘</h1><p class="hd-subtitle" data-platform>正在读取主机信息…</p></div><div class="hd-actions"><span class="hd-time" data-time>—</span><button class="hd-refresh" type="button" aria-label="刷新主机数据" title="刷新主机数据">${icon('refresh')}</button></div></header>
    <section class="hd-grid" aria-label="主机资源"><article class="hd-card hd-cpu"><div class="hd-card-head"><span class="hd-card-icon">${icon('cpu')}</span>CPU 占用</div><div class="hd-number"><span data-cpu>—</span><small>%</small></div><div class="hd-meta" data-cpu-detail>采样中…</div><div class="hd-track" role="meter" aria-label="CPU 占用" aria-valuemin="0" aria-valuemax="100"><div class="hd-fill" data-cpu-bar></div></div><svg class="hd-spark" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true"><polyline points=""/></svg></article>
    <article class="hd-card hd-memory"><div class="hd-card-head"><span class="hd-card-icon">${icon('memory')}</span>内存占用</div><div class="hd-number"><span data-memory>—</span><small>%</small></div><div class="hd-meta" data-memory-detail>读取中…</div><div class="hd-track" role="meter" aria-label="内存占用" aria-valuemin="0" aria-valuemax="100"><div class="hd-fill" data-memory-bar></div></div><p class="hd-foot">可用内存包含系统可回收缓存</p></article>
    <article class="hd-card hd-disk"><div class="hd-card-head"><span class="hd-card-icon">${icon('disk')}</span>磁盘占用</div><div class="hd-meta" data-disk-state style="margin-top:8px">读取中…</div><div class="hd-volumes" data-volumes></div></article></section>
    <p class="hd-alert" role="alert" hidden data-error>暂时无法读取主机数据，正在重试。</p><p class="hd-foot">每 2 秒刷新 · 数据来自运行 CloudCLI 的这台机器</p>
  </main>`;
  container.append(root);

  let active = true;
  let loading = false;
  const history: number[] = [];
  const error = root.querySelector<HTMLElement>('[data-error]');
  const refresh = async () => {
    // The host mounts only the selected plugin tab. Also pause when the
    // browser tab or the workspace surface is hidden (e.g. an expanded editor).
    if (!active || loading || document.visibilityState === 'hidden' || root.getClientRects().length === 0) return;
    loading = true;
    try {
      const snapshot = await api.rpc('GET', '/metrics') as ResourceSnapshot;
      if (!active) return;
      if (!snapshot || !snapshot.cpu || !snapshot.memory || !Array.isArray(snapshot.disks)) throw new Error('Invalid metrics');
      renderSnapshot(root, snapshot, history);
      if (error) error.hidden = true;
    } catch {
      if (active && error) error.hidden = false;
    } finally {
      loading = false;
    }
  };
  root.querySelector<HTMLButtonElement>('.hd-refresh')?.addEventListener('click', refresh);
  let timer: number | null = null;
  const resumePolling = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    if (!active || document.visibilityState === 'hidden') return;
    void refresh();
    timer = window.setInterval(() => { void refresh(); }, 2000);
  };
  document.addEventListener('visibilitychange', resumePolling);
  const unsubscribe = api.onContextChange(context => { root.dataset.theme = context.theme; });
  cleanups.set(container, () => {
    active = false;
    if (timer !== null) window.clearInterval(timer);
    document.removeEventListener('visibilitychange', resumePolling);
    unsubscribe();
    root.remove();
  });
  resumePolling();
}

/** Releases the polling timer and context subscription when the tab closes. */
export function unmount(container: HTMLElement): void {
  cleanups.get(container)?.();
  cleanups.delete(container);
}
