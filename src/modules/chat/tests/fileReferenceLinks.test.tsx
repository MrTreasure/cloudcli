import assert from 'node:assert/strict';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, test, vi } from 'vitest';

import { MarkdownWorkspaceContext } from '@/modules/chat/context/MarkdownWorkspaceContext';
import { i18n } from '@/modules/i18n';

/**
 * Regression guard: what a file reference in a chat message hands to the
 * editor. Both suffix helpers are anchored at the end of the string, so a
 * reference picked up from the link text — which, unlike the href, keeps the
 * whitespace around it — used to reach the API with `:12 ` still attached and
 * answer a 404.
 */

const openFileInEditor = vi.fn();
const openDirectory = vi.fn();
const readFileBlob = vi.fn();

vi.mock('@/shared/api', () => ({ api: { readFileBlob: (...args: unknown[]) => readFileBlob(...args) } }));

vi.mock('@/modules/command-palette', () => ({
  usePaletteOps: () => ({ openFileInEditor, openDirectory }),
}));

const { Markdown } = await import('@/modules/chat/transcript/Markdown');
await i18n.changeLanguage('en');

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  readFileBlob.mockReset();
});

const clickReference = (markdown: string, linkText: string) => {
  openFileInEditor.mockReset();
  openDirectory.mockReset();
  render(<Markdown>{markdown}</Markdown>);
  fireEvent.click(screen.getByText(linkText));
};

test('a `path:line` reference opens the path without its suffix, at that line', () => {
  clickReference('See [src/foo.ts:130](src/foo.ts:130).', 'src/foo.ts:130');
  assert.deepEqual(openFileInEditor.mock.calls[0], ['src/foo.ts', 130]);
});

test('whitespace around a reference taken from the link text is dropped', () => {
  clickReference('See [`src/foo.ts:12` ]().', 'src/foo.ts:12');
  assert.deepEqual(openFileInEditor.mock.calls[0], ['src/foo.ts', 12]);
});

test('a directory reference goes to the file tree, not the editor', () => {
  clickReference('See [decisions/](decisions/).', 'decisions/');
  assert.equal(openFileInEditor.mock.calls.length, 0);
  assert.deepEqual(openDirectory.mock.calls[0], ['decisions/']);
});

test('a plain file reference opens with no line', () => {
  clickReference('See [src/foo.ts](src/foo.ts).', 'src/foo.ts');
  assert.deepEqual(openFileInEditor.mock.calls[0], ['src/foo.ts', null]);
});

function renderProjectLink(markdown: string) {
  return render(<MarkdownWorkspaceContext.Provider value={{ projectId: 'project-1' }}>
    <Markdown>{markdown}</Markdown>
  </MarkdownWorkspaceContext.Provider>);
}

test('a download preserves original binary bytes, filename and authentication API without opening the editor', async () => {
  vi.useFakeTimers();
  const blob = new Blob([new Uint8Array([0, 255, 80, 75])]);
  readFileBlob.mockResolvedValue({ ok: true, blob: async () => blob });
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:download');
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeObjectURL });
  const downloads: Array<{ href: string; filename: string; attached: boolean }> = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ href: this.href, filename: this.download, attached: this.isConnected });
  });
  openFileInEditor.mockReset();
  renderProjectLink('[发布包](</workspace/发布 包.zip>)');
  assert.equal(screen.getByRole('button', { name: /发布 包.zip/ }).textContent, 'Download');
  await act(async () => fireEvent.click(screen.getByText('发布包')));
  assert.deepEqual(readFileBlob.mock.calls, [['project-1', '/workspace/发布 包.zip']]);
  assert.equal(createObjectURL.mock.calls[0][0], blob);
  assert.deepEqual(downloads, [{ href: 'blob:download', filename: '发布 包.zip', attached: true }]);
  assert.equal(openFileInEditor.mock.calls.length, 0);
  assert.equal(document.querySelector('a[download]'), null);
  assert.equal(revokeObjectURL.mock.calls.length, 0);
  vi.advanceTimersByTime(60_000);
  assert.deepEqual(revokeObjectURL.mock.calls, [['blob:download']]);
});

test('download strips editor line and column metadata and decodes the link path', async () => {
  readFileBlob.mockResolvedValue({ ok: false, status: 404 });
  renderProjectLink('[归档](docs/release%20notes.zip:12:3)');
  fireEvent.click(screen.getByRole('button', { name: /release notes.zip/ }));
  await screen.findByRole('alert');
  assert.deepEqual(readFileBlob.mock.calls, [['project-1', 'docs/release notes.zip']]);
});

test('failed downloads show an error and allow retry without saving an error body', async () => {
  const blob = vi.fn();
  readFileBlob.mockResolvedValue({ ok: false, status: 403, blob });
  renderProjectLink('[报告](report.zip)');
  const button = screen.getByRole('button', { name: /report.zip/ });
  fireEvent.click(button);
  await screen.findByRole('alert');
  assert.equal(blob.mock.calls.length, 0);
  assert.equal((button as HTMLButtonElement).disabled, false);
  fireEvent.click(button);
  await waitFor(() => assert.equal(readFileBlob.mock.calls.length, 2));
});

test('a pending download shows busy state and blocks duplicate submissions', async () => {
  let resolveRequest!: (response: { ok: boolean; status: number }) => void;
  readFileBlob.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
  renderProjectLink('[归档](archive.zip)');
  const button = screen.getByRole('button', { name: /archive.zip/ });
  fireEvent.click(button);
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal((button as HTMLButtonElement).disabled, true);
  fireEvent.click(button);
  assert.equal(readFileBlob.mock.calls.length, 1);
  await act(async () => resolveRequest({ ok: false, status: 404 }));
  assert.equal(button.getAttribute('aria-busy'), 'false');
});

test('directories, web links and links without a project do not offer workspace downloads', () => {
  const { unmount } = renderProjectLink('[目录](artifacts/) [网页](https://example.com/file.zip) [CDN](//example.com/file.zip)');
  assert.equal(screen.queryAllByRole('button').length, 0);
  assert.equal(screen.getByText('CDN').getAttribute('target'), '_blank');
  unmount();
  render(<Markdown>{'[本地文件](archive.zip)'}</Markdown>);
  assert.equal(screen.queryAllByRole('button').length, 0);
});

test('network failures show a retryable error beside the file link', async () => {
  readFileBlob.mockRejectedValue(new Error('Network unavailable'));
  renderProjectLink('[附件](attachment.zip)');
  const button = screen.getByRole('button', { name: /attachment.zip/ });
  fireEvent.click(button);
  await screen.findByRole('alert');
  assert.equal((button as HTMLButtonElement).disabled, false);
});

// Preview support is shared with the editor, including text and browser media.
test('previewable files open directly without displaying download actions', () => {
  for (const filename of ['SKILL.md', 'notes.txt', 'source.ts', 'report.pdf', 'picture.png', 'drawing.svg', 'clip.mp4', 'sound.mp3']) {
    openFileInEditor.mockReset();
    const { unmount } = renderProjectLink(`[打开文件](${filename})`);
    assert.equal(screen.queryAllByRole('button').length, 0);
    fireEvent.click(screen.getByText('打开文件'));
    assert.deepEqual(openFileInEditor.mock.calls, [[filename, null]]);
    assert.equal(readFileBlob.mock.calls.length, 0);
    unmount();
  }
});
