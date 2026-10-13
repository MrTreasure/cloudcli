import assert from 'node:assert/strict';
import test from 'node:test';

import { availableMacMemory, availableMemory, cpuUsage, diskUsage } from './metrics.ts';

test('CPU percentage uses the delta across all cores', () => {
  const before = [{ user: 10, nice: 0, sys: 10, idle: 80, irq: 0 }];
  const after = [{ user: 30, nice: 0, sys: 15, idle: 155, irq: 0 }];
  assert.equal(cpuUsage(before, after), 25);
});

test('memory uses MemAvailable so reclaimable cache is not counted as busy', () => {
  assert.equal(availableMemory('MemFree: 100 kB\nMemAvailable: 400 kB\n', 0), 400 * 1024);
  assert.equal(availableMemory('MemFree: 100 kB\n', 900), 900);
});

test('macOS memory includes inactive and speculative pages', () => {
  const vmStat = 'Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 100.\nPages inactive: 200.\nPages speculative: 50.\n';
  assert.equal(availableMacMemory(vmStat, 0), 350 * 16384);
});

test('disk percentage matches usable blocks instead of counting reserved space as free', () => {
  const disk = diskUsage('/', '系统盘', { blocks: 100, bfree: 30, bavail: 20, bsize: 1024 });
  assert.equal(disk.used, 70 * 1024);
  assert.equal(disk.available, 20 * 1024);
  assert.equal(disk.percentage, 77.8);
});
