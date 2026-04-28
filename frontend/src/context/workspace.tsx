import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "./auth";
import { isSuperAdmin, type WorkspaceAccessRole } from "../lib/roles";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  createdByUserId: string;
  role: WorkspaceAccessRole;
};

type WorkspaceState = {
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary | null;
  currentWorkspaceRole: WorkspaceAccessRole | null;
  selectedWorkspaceId: string | null;
  loading: boolean;
  setSelectedWorkspaceId: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
  canSwitchWorkspaces: boolean;
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
    if (!isSuperAdmin(user?.role)) {
      return;
    }
    setSelectedWorkspaceIdState(workspaceId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    }
  }, [user?.role]);

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
      const next = isSuperAdmin(user.role) ? result.workspaces : result.workspaces.slice(0, 1);
      setWorkspaces(next);

      if (isSuperAdmin(user.role)) {
        const selected = selectedWorkspaceId;
        const hasSelected = selected && next.some((workspace) => workspace.id === selected);
        if (hasSelected) return;

        const first = next[0];
        if (first) {
          setSelectedWorkspaceId(first.id);
        } else {
          clearSelection();
        }
      } else {
        const first = next[0];
        setSelectedWorkspaceIdState(first?.id ?? null);
        if (typeof window !== "undefined") {
          if (first?.id) {
            window.localStorage.setItem(WORKSPACE_STORAGE_KEY, first.id);
          } else {
            window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
          }
        }
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

  const currentWorkspace = useMemo(
    () => (selectedWorkspaceId ? workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null : null),
    [selectedWorkspaceId, workspaces]
  );
  const currentWorkspaceRole = currentWorkspace?.role ?? null;
  const canSwitchWorkspaces = isSuperAdmin(user?.role) && workspaces.length > 1;

  const value = useMemo(
    () => ({
      workspaces,
      currentWorkspace,
      currentWorkspaceRole,
      selectedWorkspaceId,
      loading,
      setSelectedWorkspaceId,
      refreshWorkspaces,
      canSwitchWorkspaces,
    }),
    [
      workspaces,
      currentWorkspace,
      currentWorkspaceRole,
      selectedWorkspaceId,
      loading,
      setSelectedWorkspaceId,
      refreshWorkspaces,
      canSwitchWorkspaces,
    ]
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
