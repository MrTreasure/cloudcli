import { afterEach, beforeEach, expect, test, vi } from 'vitest';

// This independently built plugin lives outside the application's src tree.
// eslint-disable-next-line no-restricted-imports
import { mount, unmount } from '../../../../local-plugins/cloudcli-host-dashboard/src/index';

let container: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  container = document.createElement('div');
  document.body.append(container);
});

afterEach(() => {
  unmount(container);
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('dashboard requests only while mounted, visible and selected', async () => {
  const rpc = vi.fn(async () => ({
    capturedAt: new Date().toISOString(),
    host: { platform: 'macOS', processor: 'Apple M4' },
    cpu: { percentage: 20, cores: 10, loadOneMinute: 1 },
    memory: { used: 1, total: 2, available: 1, percentage: 50 },
    disks: [],
  }));
  const unsubscribe = vi.fn();
  const visibility = vi.spyOn(document, 'visibilityState', 'get');

  await vi.advanceTimersByTimeAsync(4000);
  expect(rpc).not.toHaveBeenCalled();
  mount(container, { context: { theme: 'light' }, onContextChange: () => unsubscribe, rpc });
  await vi.advanceTimersByTimeAsync(4000);
  expect(rpc).toHaveBeenCalledTimes(3);
  expect(container.querySelector('h1')?.textContent).toBe('仪表盘');

  visibility.mockReturnValue('hidden');
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(6000);
  expect(rpc).toHaveBeenCalledTimes(3);

  visibility.mockReturnValue('visible');
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(0);
  expect(rpc).toHaveBeenCalledTimes(4);

  vi.mocked(HTMLElement.prototype.getClientRects).mockReturnValue({ length: 0 } as DOMRectList);
  await vi.advanceTimersByTimeAsync(4000);
  expect(rpc).toHaveBeenCalledTimes(4);

  unmount(container);
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(6000);
  expect(rpc).toHaveBeenCalledTimes(4);
});
