import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { externalizeCodexHistoryImages } from '@/modules/providers/services/codex-history-images.service.js';
import { readCodexHistoryRecords } from '@/modules/providers/services/codex-history-reader.service.js';
import type { AnyRecord } from '@/shared/types.js';

test('large compaction snapshots stream as boundaries, keeping source bytes and ordinary records intact', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'codex-projection-'));
  try {
    const file = path.join(root, 'rollout.jsonl');
    const first = { timestamp: '2026-10-27T00:00:00Z', type: 'event_msg', payload: { type: 'user_message', message: '中文🙂 ' + 'a'.repeat(65500) } };
    const compacted = { timestamp: '2026-10-27T00:01:00Z', type: 'compacted', payload: { replacement_history: ['x'.repeat(8 * 1024 * 1024)] } };
    const last = { timestamp: '2026-10-27T00:02:00Z', type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'unchanged' }] } };
    const original = [first, compacted, last].map(row => JSON.stringify(row)).join('\n') + '\n';
    await writeFile(file, original);
    const records = [];
    for await (const row of readCodexHistoryRecords(file)) records.push(row);
    assert.equal(records.length, 3);
    assert.deepEqual(JSON.parse(records[0].line), first);
    assert.deepEqual(JSON.parse(records[2].line), last);
    assert.deepEqual(JSON.parse(records[1].line), { timestamp: compacted.timestamp, type: 'compacted', payload: {} });
    assert.ok(records[1].line.length < 150);
    assert.equal(records[2].endByteOffset, Buffer.byteLength(original));
    assert.equal(await readFile(file, 'utf8'), original);
    const raw = [];
    for await (const row of readCodexHistoryRecords(file, { compactSnapshots: false })) raw.push(row);
    assert.deepEqual(JSON.parse(raw[1].line), compacted);
    await appendFile(file, JSON.stringify(last));
    const added = [];
    for await (const row of readCodexHistoryRecords(file, { start: Buffer.byteLength(original) })) added.push(row);
    assert.deepEqual(JSON.parse(added[0].line), last);
    assert.equal(added[0].terminated, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('visible base64 images become deduplicated authenticated asset paths with lossless originals', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'codex-history-images-'));
  t.mock.method(os, 'homedir', () => root);
  try {
    const bytes = Buffer.from('lossless original image bytes');
    const data = `data:image/png;base64,${bytes.toString('base64')}`;
    const messages: AnyRecord[] = [ { images: [{ data }, { data }] }, { images: [{ path: '/unchanged.png' }] } ];
    await externalizeCodexHistoryImages(messages);
    const image = messages[0].images[0];
    assert.equal(image.data, undefined);
    assert.equal(image.path, messages[0].images[1].path);
    assert.deepEqual(await readFile(image.path), bytes);
    assert.ok(image.path.includes(createHash('sha256').update(bytes).digest('hex')));
    assert.equal((await readdir(path.join(root, '.cloudcli/assets'))).length, 1);
    assert.equal(messages[1].images[0].path, '/unchanged.png');
    await externalizeCodexHistoryImages([{ images: [{ data }] }]);
    assert.equal((await readdir(path.join(root, '.cloudcli/assets'))).length, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('GUI projection skips tool image binaries across chunk boundaries without touching text, metadata or user images', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'codex-tool-projection-'));
  try {
    const file = path.join(root, 'tool.jsonl');
    const data = 'data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024);
    const text = JSON.stringify({ type: 'input_image', image_url: data.slice(0, 80) });
    const row = { timestamp: '2026-10-27T00:00:00Z', type: 'response_item', payload: { type: 'custom_tool_call_output', call_id: 'call-1', output: [
      { type: 'input_text', text }, { type: 'input_image', image_url: data }, { type: 'input_text', text: '文字🙂 after image' },
      { type: 'input_image', image_url: data },
    ] } };
    const user = { timestamp: row.timestamp, type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_image', image_url: data.slice(0, 100) }] } };
    const original = [row, user].map(value => JSON.stringify(value)).join('\n') + '\n';
    await writeFile(file, original);
    const rows = [];
    for await (const record of readCodexHistoryRecords(file)) rows.push(record);
    const projected = JSON.parse(rows[0].line);
    assert.equal(projected.payload.call_id, 'call-1');
    assert.deepEqual(projected.payload.output.filter((part: AnyRecord) => part.type === 'input_text'), row.payload.output.filter(part => part.type === 'input_text'));
    assert.equal(projected.payload.output[1].image_url, '');
    assert.equal(projected.payload.output[3].image_url, '');
    assert.ok(rows[0].line.length < 1000);
    assert.deepEqual(JSON.parse(rows[1].line), user);
    assert.equal(await readFile(file, 'utf8'), original);
  } finally { await rm(root, { recursive: true, force: true }); }
});
