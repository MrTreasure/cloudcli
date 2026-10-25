import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useMarkdownWorkspaceProjectId } from '@/modules/chat/context/MarkdownWorkspaceContext';
import { usePaletteOps } from '@/modules/command-palette';
import { api } from '@/shared/api';
import { getPreviewKind, isBinaryFile } from '@/shared/utils';

type WorkspaceFileLinkProps = {
  reference: string;
  href?: string;
  children: ReactNode;
};

/** Chat Markdown uses this link to preview workspace files or download their original bytes. */
export function WorkspaceFileLink({ reference, href, children }: WorkspaceFileLinkProps) {
  const { t } = useTranslation('chat');
  const projectId = useMarkdownWorkspaceProjectId();
  const { openFileInEditor, openDirectory } = usePaletteOps();
  // Disable repeated downloads and show progress while the authenticated request is pending.
  const [isDownloading, setIsDownloading] = useState(false);
  // Keep failures beside the affected link so another file's status cannot overwrite them.
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const trimmed = reference.trim();
  const line = trimmed.match(/:(\d+)(?::\d+)?$/);
  let filePath = trimmed.replace(/:\d+(?::\d+)?$/, '');
  try {
    filePath = decodeURIComponent(filePath);
  } catch {
    // A literal percent sign in a filename is valid even when it is not URI encoded.
  }
  const isDirectory = filePath.endsWith('/');
  const filename = filePath.split(/[\\/]/).pop() || filePath;
  const downloadLabel = t('fileLinks.download', { name: filename });

  const download = async () => {
    if (!projectId || isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      // A browser link cannot send the bearer header to a separately hosted backend.
      const response = await api.readFileBlob(projectId, filePath);
      if (!response.ok) {
        setDownloadError(t(response.status === 404 ? 'fileLinks.notFound' : 'fileLinks.downloadFailed'));
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        try {
          anchor.click();
        } finally {
          anchor.remove();
        }
      } finally {
        // Give mobile browsers time to start saving before releasing the object URL.
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch {
      setDownloadError(t('fileLinks.downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <span>
      <a
        href={href || reference}
        className="cursor-pointer text-blue-600 hover:underline dark:text-blue-400"
        onClick={(event) => {
          event.preventDefault();
          if (isDirectory) openDirectory(filePath);
          else if (projectId && isBinaryFile(filename) && !getPreviewKind(filename)) void download();
          else openFileInEditor(filePath, line ? Number(line[1]) : null);
        }}
      >
        {children}
      </a>
      {!isDirectory && projectId && (
        <button
          type="button"
          onClick={() => void download()}
          disabled={isDownloading}
          aria-label={downloadLabel}
          aria-busy={isDownloading}
          title={downloadLabel}
          className="not-prose ml-1 inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded px-1.5 align-middle text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait sm:min-h-7 sm:min-w-7"
        >
          {isDownloading
            ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            : <Download className="h-4 w-4" aria-hidden="true" />}
          <span>{t('fileLinks.downloadAction')}</span>
        </button>
      )}
      {downloadError && <span role="alert" className="ml-2 text-xs text-destructive">{downloadError}</span>}
    </span>
  );
}
