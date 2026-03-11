import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "./auth";

export type WorkspaceRole = "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  createdByUserId: string;
  role: WorkspaceRole;
};

type WorkspaceState = {
  workspaces: WorkspaceSummary[];
  selectedWorkspaceId: string | null;
  loading: boolean;
  setSelectedWorkspaceId: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
};

const WORKSPACE_STORAGE_KEY = "selectedWorkspaceId";

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
  });
  const [loading, setLoading] = useState(false);

  const setSelectedWorkspaceId = useCallback((workspaceId: string) => {
    setSelectedWorkspaceIdState(workspaceId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedWorkspaceIdState(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      clearSelection();
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{ workspaces: WorkspaceSummary[] }>("/me/workspaces");
      const next = result.workspaces;
      setWorkspaces(next);

      const selected = selectedWorkspaceId;
      const hasSelected = selected && next.some((workspace) => workspace.id === selected);
      if (hasSelected) return;

      const first = next[0];
      if (first) {
        setSelectedWorkspaceId(first.id);
      } else {
        clearSelection();
      }
    } catch {
      setWorkspaces([]);
      clearSelection();
    } finally {
      setLoading(false);
    }
  }, [clearSelection, selectedWorkspaceId, setSelectedWorkspaceId, user]);

  useEffect(() => {
    if (authLoading) return;
    void refreshWorkspaces();
  }, [authLoading, refreshWorkspaces]);

  const value = useMemo(
    () => ({
      workspaces,
      selectedWorkspaceId,
      loading,
      setSelectedWorkspaceId,
      refreshWorkspaces,
    }),
    [workspaces, selectedWorkspaceId, loading, setSelectedWorkspaceId, refreshWorkspaces]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
