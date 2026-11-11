import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/shared/api';
import type { Project,FileTreeNode } from '@/shared/types';

type UseFileTreeDataResult = {
  files: FileTreeNode[];
  loading: boolean;
  error: string | null;
  refreshFiles: () => void;
  branchError: string | null;
  partial: boolean;
};

const DEFAULT_LOAD_ERROR = 'Unable to load the file tree for this project.';

// The API reports refusals such as FILE_TREE_TOO_LARGE as { error: message }.
// Surfacing that message tells the user why the tree is missing and what to do
// about it, instead of leaving them with an unexplained empty tree.
function readResponseErrorMessage(responseBody: string): string | null {
  try {
    const parsedBody = JSON.parse(responseBody) as unknown;
    const message = typeof parsedBody === 'object' && parsedBody !== null && 'error' in parsedBody
      ? (parsedBody as { error: unknown }).error
      : null;
    return typeof message === 'string' && message.trim() ? message : null;
  } catch {
    return null;
  }
}

function replaceChildren(nodes: FileTreeNode[], directoryPath: string, children: FileTreeNode[]): FileTreeNode[] {
  return nodes.map((node) => node.path === directoryPath
    ? { ...node, children }
    : node.children ? { ...node, children: replaceChildren(node.children, directoryPath, children) } : node);
}

function deferredDirectories(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.flatMap((node) => node.type !== 'directory' || node.isSymlink ? []
    : node.children === undefined ? [node] : deferredDirectories(node.children));
}

/** Used by FileTree to retain small trees and load large branches on expansion. */
export function useFileTreeData(selectedProject: Project | null, expandedDirs: Set<string>): UseFileTreeDataResult {
  // Loaded entries are retained while individual large directories are expanded.
  const [files, setFiles] = useState<FileTreeNode[]>([]);
  // The initial root read controls the panel loading state.
  const [loading, setLoading] = useState(false);
  // A root failure replaces the tree with its error message.
  const [error, setError] = useState<string | null>(null);
  // Explicit refresh invalidates root and branch reads together.
  const [refreshKey, setRefreshKey] = useState(0);
  // Branch failures leave the rest of the tree usable and offer explicit refresh.
  const [branchError, setBranchError] = useState<string | null>(null);
  const branchRequestsRef = useRef(new Map<string, AbortController>());
  const failedBranchesRef = useRef(new Set<string>());
  const loadedProjectRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshFiles = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    for (const controller of branchRequestsRef.current.values()) controller.abort();
    branchRequestsRef.current.clear();
    failedBranchesRef.current.clear();
    setBranchError(null);
    loadedProjectRef.current = null;
    setFiles([]);
    // File-tree requests use the DB projectId; the backend resolves it to the
    // project's absolute path through the projects table.
    const projectId = selectedProject?.projectId;

    if (!projectId) {
      setFiles([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Track mount state so aborted or late responses do not enqueue stale state updates.
    let isActive = true;

    const fetchFiles = async () => {
      if (isActive) {
        setLoading(true);
        setError(null);
      }
      try {
        const response = await api.getFiles(projectId, { signal: abortControllerRef.current!.signal });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('File fetch failed:', response.status, errorText);
          if (isActive) {
            setFiles([]);
            setError(readResponseErrorMessage(errorText) ?? DEFAULT_LOAD_ERROR);
          }
          return;
        }

        const data = (await response.json()) as FileTreeNode[];
        if (isActive) {
          loadedProjectRef.current = projectId;
          setFiles(data);
        }
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') {
          return;
        }

        console.error('Error fetching files:', error);
        if (isActive) {
          setFiles([]);
          setError(DEFAULT_LOAD_ERROR);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchFiles();

    return () => {
      isActive = false;
      abortControllerRef.current?.abort();
      for (const controller of branchRequestsRef.current.values()) controller.abort();
    };
  }, [selectedProject?.projectId, refreshKey]);

  useEffect(() => {
    const projectId = selectedProject?.projectId;
    if (!projectId || loading || loadedProjectRef.current !== projectId) return;
    const pending = deferredDirectories(files).filter((node) => expandedDirs.has(node.path));
    for (const node of pending) {
      if (branchRequestsRef.current.size >= 3) break;
      if (branchRequestsRef.current.has(node.path) || failedBranchesRef.current.has(node.path)) continue;
      const controller = new AbortController();
      branchRequestsRef.current.set(node.path, controller);
      void (async () => {
        try {
          const response = await api.getFiles(projectId, { signal: controller.signal }, node.path);
          if (!response.ok) throw new Error(readResponseErrorMessage(await response.text()) ?? DEFAULT_LOAD_ERROR);
          const children = await response.json() as FileTreeNode[];
          if (!controller.signal.aborted) setFiles((previous) => replaceChildren(previous, node.path, children));
        } catch (error) {
          if (!controller.signal.aborted) {
            failedBranchesRef.current.add(node.path);
            setBranchError(`${node.name}: ${error instanceof Error ? error.message : DEFAULT_LOAD_ERROR}`);
          }
        } finally {
          if (branchRequestsRef.current.get(node.path) === controller) branchRequestsRef.current.delete(node.path);
        }
      })();
    }
  }, [files, expandedDirs, selectedProject?.projectId, loading, branchError]);

  return {
    branchError,
    partial: deferredDirectories(files).length > 0,
    files,
    loading,
    error,
    refreshFiles,
  };
}
