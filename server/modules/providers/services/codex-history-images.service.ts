import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getGlobalImageAssetsDir, toPosixPath } from '@/shared/image-attachments.js';
import type { AnyRecord } from '@/shared/types.js';

const EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

/** Codex's GUI history reader stores visible inline images once; native rollouts and model inputs remain byte-identical. */
export async function externalizeCodexHistoryImages(messages: AnyRecord[]): Promise<void> {
  // Only keep paths during this load, never an unbounded process-wide base64 map.
  const saved = new Map<string, string>();
  for (const message of messages) {
    if (!Array.isArray(message.images)) continue;
    for (const image of message.images) {
      if (!image || typeof image.data !== 'string') continue;
      const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(image.data);
      if (!match) continue;
      const bytes = Buffer.from(match[2], 'base64');
      if (!bytes.length || bytes.length > 20 * 1024 * 1024) continue;
      const digest = createHash('sha256').update(bytes).digest('hex');
      const filename = `history-${digest}.${EXTENSIONS[match[1]]}`;
      let file = saved.get(filename);
      if (!file) {
        file = path.join(getGlobalImageAssetsDir(), filename);
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
          try { await stat(file); }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            await mkdir(getGlobalImageAssetsDir(), { recursive: true, mode: 0o700 });
            await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 });
            await rename(temporary, file);
          }
        } catch {
          // Read-only disks/full volumes must preserve the inline preview.
          console.warn('[Codex history images]', { code: 'HISTORY_IMAGE_REFERENCE_FALLBACK' });
          continue;
        } finally { await unlink(temporary).catch(() => {}); }
        saved.set(filename, file);
      }
      image.path = toPosixPath(file);
      delete image.data;
    }
  }
}
