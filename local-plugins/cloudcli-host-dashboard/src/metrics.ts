import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export type CpuTimes = { user: number; nice: number; sys: number; idle: number; irq: number };
export type DiskUsage = { mount: string; label: string; used: number; total: number; available: number; percentage: number };
export type ResourceSnapshot = {
  capturedAt: string;
  host: { platform: string; processor: string };
  cpu: { percentage: number; cores: number; loadOneMinute: number };
  memory: { used: number; total: number; available: number; percentage: number };
  disks: DiskUsage[];
};

function percentage(used: number, total: number): number {
  return total > 0 ? Math.round(Math.min(100, Math.max(0, used / total * 100)) * 10) / 10 : 0;
}

/** Computes whole-host CPU busy time between two samples, across all cores. */
export function cpuUsage(previous: CpuTimes[], current: CpuTimes[]): number {
  let busy = 0;
  let elapsed = 0;
  for (let index = 0; index < Math.min(previous.length, current.length); index += 1) {
    const before = previous[index];
    const after = current[index];
    const idleDelta = Math.max(0, after.idle - before.idle);
    const totalDelta = Math.max(0,
      after.user + after.nice + after.sys + after.idle + after.irq
      - before.user - before.nice - before.sys - before.idle - before.irq,
    );
    elapsed += totalDelta;
    busy += Math.max(0, totalDelta - idleDelta);
  }
  return percentage(busy, elapsed);
}

/** Linux MemAvailable excludes reclaimable cache from the displayed usage. */
export function availableMemory(meminfo: string, fallback: number): number {
  const match = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(meminfo);
  return match ? Number(match[1]) * 1024 : fallback;
}

/** Estimates reclaimable macOS memory from vm_stat's page counts. */
export function availableMacMemory(vmStat: string, fallback: number): number {
  const pageSize = Number(/page size of (\d+) bytes/.exec(vmStat)?.[1]);
  if (!Number.isFinite(pageSize) || pageSize <= 0) return fallback;
  let pages = 0;
  for (const label of ['Pages free', 'Pages inactive', 'Pages speculative']) {
    const match = new RegExp(`^${label}:\\s+([0-9.]+)\\.?$`, 'm').exec(vmStat);
    if (!match) return fallback;
    pages += Number(match[1].replace(/\./g, ''));
  }
  return pages * pageSize;
}

/** Mirrors df's capacity calculation, excluding filesystem-reserved blocks. */
export function diskUsage(mount: string, label: string, stats: Pick<fs.StatsFs, 'blocks' | 'bfree' | 'bavail' | 'bsize'>): DiskUsage {
  const used = Math.max(0, (stats.blocks - stats.bfree) * stats.bsize);
  const available = Math.max(0, stats.bavail * stats.bsize);
  return { mount, label, used, available, total: stats.blocks * stats.bsize, percentage: percentage(used, used + available) };
}

let previousCpuTimes = os.cpus().map((cpu) => cpu.times);

function diskMounts(): Array<{ path: string; label: string }> {
  if (process.platform === 'linux') {
    return [
      ...(fs.existsSync('/vol1') ? [{ path: '/vol1', label: '数据卷' }] : []),
      { path: '/', label: '系统盘' },
    ];
  }
  if (process.platform === 'darwin') {
    const mounts = [{ path: '/', label: '启动盘' }];
    try {
      const rootDevice = fs.statSync('/').dev;
      for (const name of fs.readdirSync('/Volumes')) {
        const mount = path.join('/Volumes', name);
        try {
          const stat = fs.statSync(mount);
          if (stat.isDirectory() && stat.dev !== rootDevice) mounts.push({ path: mount, label: name });
        } catch { /* Skip only the unreadable volume. */ }
      }
    } catch { /* A missing or unreadable /Volumes leaves the startup disk. */ }
    return mounts;
  }
  return [{ path: os.homedir(), label: '本机磁盘' }];
}

/** Reads only fixed host-local sources for the authenticated plugin RPC. */
export function readResourceSnapshot(): ResourceSnapshot {
  const cpus = os.cpus();
  const currentTimes = cpus.map((cpu) => cpu.times);
  const cpuPercentage = cpuUsage(previousCpuTimes, currentTimes);
  previousCpuTimes = currentTimes;

  let memoryAvailable = os.freemem();
  if (process.platform === 'linux') {
    try { memoryAvailable = availableMemory(fs.readFileSync('/proc/meminfo', 'utf8'), memoryAvailable); }
    catch { /* os.freemem remains a safe fallback */ }
  } else if (process.platform === 'darwin') {
    try { memoryAvailable = availableMacMemory(execFileSync('vm_stat', { encoding: 'utf8', timeout: 1500 }), memoryAvailable); }
    catch { /* os.freemem remains a safe fallback */ }
  }
  const memoryTotal = os.totalmem();
  memoryAvailable = Math.min(memoryTotal, Math.max(0, memoryAvailable));
  const disks: DiskUsage[] = [];
  for (const mount of diskMounts()) {
    try { disks.push(diskUsage(mount.path, mount.label, fs.statfsSync(mount.path))); }
    catch { /* The data volume is optional on other machines. */ }
  }

  return {
    capturedAt: new Date().toISOString(),
    host: {
      platform: process.platform === 'darwin' ? 'macOS' : process.platform === 'linux' ? 'Linux' : os.type(),
      processor: cpus[0]?.model?.trim() || os.arch(),
    },
    cpu: { percentage: cpuPercentage, cores: cpus.length, loadOneMinute: Math.round(os.loadavg()[0] * 100) / 100 },
    memory: {
      used: Math.max(0, memoryTotal - memoryAvailable),
      total: memoryTotal,
      available: memoryAvailable,
      percentage: percentage(memoryTotal - memoryAvailable, memoryTotal),
    },
    disks,
  };
}
