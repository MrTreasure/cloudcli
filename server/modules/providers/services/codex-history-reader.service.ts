import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { StringDecoder } from 'node:string_decoder';

type ReadOptions = { start?: number; end?: number; compactSnapshots?: boolean };
// Native Codex writes these fields first. Unrecognized/reordered records take
// the ordinary JSON path; never match a nested property or prompt substring.
const COMPACTED_HEADER = /^\s*\{\s*"timestamp"\s*:\s*("(?:[^"\\]|\\.)*")\s*,\s*"type"\s*:\s*"compacted"\s*,/;

// Tool result image blocks are never rendered by extractCodexToolOutput. Drop
// only their binary value from the GUI projection before JSON.parse; native
// files and all text blocks remain intact. JSON string quoting prevents this
// pattern from matching escaped examples inside ordinary tool output text.
const TOOL_RESULT_HEADER = /^\s*\{\s*"timestamp"\s*:\s*"(?:[^"\\]|\\.)*"\s*,\s*"type"\s*:\s*"response_item"\s*,\s*"payload"\s*:\s*\{\s*"type"\s*:\s*"(?:custom_tool_call_output|function_call_output)"/;
const TOOL_IMAGE_PREFIX = /(\{\s*"type"\s*:\s*"input_image"\s*,\s*"image_url"\s*:\s*")data:image\/(?:png|jpeg|webp|gif);base64,/;
function createToolImageProjection() {
  let tail = '';
  let skipping = false;
  let trailingEscape = false;
  return (piece: string, final = false): string => {
    let input = tail + piece;
    let output = '';
    tail = '';
    for (;;) {
      if (skipping) {
        let quote = input.indexOf('"');
        while (quote >= 0) {
          let slashes = 0;
          for (let index = quote - 1; index >= 0 && input[index] === '\\'; index--) slashes++;
          const escaped = (slashes + (slashes === quote && trailingEscape ? 1 : 0)) % 2 === 1;
          if (!escaped) break;
          quote = input.indexOf('"', quote + 1);
        }
        if (quote < 0) {
          let slashes = 0;
          for (let index = input.length - 1; index >= 0 && input[index] === '\\'; index--) slashes++;
          trailingEscape = (slashes + (slashes === input.length && trailingEscape ? 1 : 0)) % 2 === 1;
          return output;
        }
        input = input.slice(quote); skipping = false; trailingEscape = false;
      }
      const match = TOOL_IMAGE_PREFIX.exec(input);
      if (!match) {
        const keep = final ? 0 : Math.min(256, input.length);
        output += input.slice(0, input.length - keep);
        tail = keep ? input.slice(-keep) : '';
        return output;
      }
      output += input.slice(0, match.index) + match[1];
      input = input.slice(match.index + match[0].length);
      skipping = true;
    }
  };
}

/** Codex history and image diagnostics stream native records without buffering unused compaction snapshots. */
export async function* readCodexHistoryRecords(file: string, options: ReadOptions = {}) {
  const start = options.start ?? 0;
  const end = options.end ?? (await stat(file)).size;
  if (end <= start) return;
  const stream = createReadStream(file, { start, end: end - 1, highWaterMark: 64 * 1024 });
  let parts: string[] = [];
  let decoder: StringDecoder | null = null;
  let length = 0;
  let position = start;
  let projected: string | null = null;
  let headerChecked = false;
  let toolProjection: ReturnType<typeof createToolImageProjection> | null = null;
  try {
    for await (const chunk of stream) {
      let cursor = 0;
      while (cursor < chunk.length) {
        const newline = chunk.indexOf(10, cursor);
        const finish = newline < 0 ? chunk.length : newline;
        const piece = chunk.subarray(cursor, finish);
        if (!projected) {
          decoder ??= new StringDecoder('utf8');
          const decoded = decoder.write(piece);
          parts.push(toolProjection ? toolProjection(decoded) : decoded);
          length += piece.length;
          if (!headerChecked && (length >= 1024 || newline >= 0)) {
            headerChecked = true;
            const prefix = parts.join('').slice(0, 1024);
            const match = options.compactSnapshots !== false ? COMPACTED_HEADER.exec(prefix) : null;
            if (!match && options.compactSnapshots !== false && TOOL_RESULT_HEADER.test(prefix)) {
              toolProjection = createToolImageProjection();
              parts = [toolProjection(parts.join(''))];
            }
            if (match) {
              projected = `{"timestamp":${match[1]},"type":"compacted","payload":{}}`;
              parts = [];
              length = 0;
            }
          }
        }
        position += piece.length;
        if (newline >= 0) {
          position += 1;
          const remainder = decoder?.end() ?? '';
          if (toolProjection) parts.push(toolProjection(remainder, true));
          else if (remainder) parts.push(remainder);
          yield { line: projected ?? parts.join(''), endByteOffset: position, terminated: true };
          parts = []; length = 0; projected = null; headerChecked = false; toolProjection = null; decoder = null;
        }
        cursor = newline < 0 ? chunk.length : newline + 1;
      }
    }
    // Ordinary complete JSON without a final LF remains readable. Incremental
    // image indexing deliberately does not commit this live tail's offset.
    const remainder = decoder?.end() ?? '';
    if (toolProjection) parts.push(toolProjection(remainder, true));
    else if (remainder) parts.push(remainder);
    if (length) yield { line: parts.join(''), endByteOffset: position, terminated: false };
  } finally { stream.destroy(); }
}
