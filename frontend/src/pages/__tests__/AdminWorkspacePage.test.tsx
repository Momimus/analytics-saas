import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminWorkspacePage from "../AdminWorkspace";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useWorkspace: vi.fn(),
  createWorkspace: vi.fn(),
  upsertWorkspaceMember: vi.fn(),
}));

vi.mock("../../context/auth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../../context/workspace", () => ({
  useWorkspace: mocks.useWorkspace,
}));

vi.mock("../../lib/workspaces", () => ({
  createWorkspace: mocks.createWorkspace,
  upsertWorkspaceMember: mocks.upsertWorkspaceMember,
}));

afterEach(() => {
  vi.resetAllMocks();
});

type MockWorkspace = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  createdByUserId: string;
  role: "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER";
};

function baseWorkspaceState(overrides: Record<string, unknown> = {}) {
  const currentWorkspace: MockWorkspace | null =
    overrides.currentWorkspace === undefined
      ? {
          id: "ws-1",
          name: "Northwind",
          slug: "northwind",
          createdAt: "2026-03-10T00:00:00.000Z",
          createdByUserId: "user-1",
          role: "WORKSPACE_ADMIN" as const,
        }
      : (overrides.currentWorkspace as MockWorkspace | null);
  return {
    workspaces: [
      {
        id: "ws-1",
        name: "Northwind",
        slug: "northwind",
        createdAt: "2026-03-10T00:00:00.000Z",
        createdByUserId: "user-1",
        role: "WORKSPACE_ADMIN" as const,
      },
      {
        id: "ws-2",
        name: "Acme",
        slug: "acme",
        createdAt: "2026-03-11T00:00:00.000Z",
        createdByUserId: "user-2",
        role: "WORKSPACE_VIEWER" as const,
      },
    ],
    currentWorkspace,
    currentWorkspaceRole: currentWorkspace ? currentWorkspace.role : null,
    selectedWorkspaceId: "ws-1",
    setSelectedWorkspaceId: vi.fn(),
    refreshWorkspaces: vi.fn().mockResolvedValue(undefined),
    loading: false,
    canSwitchWorkspaces: false,
    ...overrides,
  };
}

describe("AdminWorkspacePage", () => {
  it("renders workspace overview and read-only messaging for viewer users", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "viewer-1", email: "viewer@example.com", role: "WORKSPACE_VIEWER" },
    });
    mocks.useWorkspace.mockReturnValue(
      baseWorkspaceState({
        currentWorkspace: {
          id: "ws-2",
          name: "Acme",
          slug: "acme",
          createdAt: "2026-03-11T00:00:00.000Z",
          createdByUserId: "user-2",
          role: "WORKSPACE_VIEWER" as const,
        },
        currentWorkspaceRole: "WORKSPACE_VIEWER",
        selectedWorkspaceId: "ws-2",
      })
    );

    render(<AdminWorkspacePage />);

    expect(screen.getByText("Workspace Context")).toBeInTheDocument();
    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Viewer").length).toBeGreaterThan(0);
    expect(screen.getByText("You have read-only workspace access. Member and settings actions are hidden.")).toBeInTheDocument();
    expect(screen.getByText("Workspace member management is available only to workspace admins and super admins.")).toBeInTheDocument();
    expect(screen.getByText("Workspace creation is reserved for super admins.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add or update member" })).not.toBeInTheDocument();
  });

  it("lets workspace admins upsert a member by email and keeps unsupported capabilities honest", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
    });
    mocks.useWorkspace.mockReturnValue(baseWorkspaceState());
    mocks.upsertWorkspaceMember.mockResolvedValue({
      member: {
        id: "member-1",
        workspaceId: "ws-1",
        userId: "user-22",
        role: "WORKSPACE_VIEWER",
        createdAt: "2026-03-28T10:00:00.000Z",
      },
    });

    render(<AdminWorkspacePage />);

    fireEvent.change(screen.getByLabelText("Member email"), {
      target: { value: "teammate@company.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add or update member" }));

    await waitFor(() => {
      expect(mocks.upsertWorkspaceMember).toHaveBeenCalledWith("ws-1", {
        email: "teammate@company.com",
        role: "WORKSPACE_VIEWER",
      });
    });
    expect(await screen.findByText("Member access updated for teammate@company.com.")).toBeInTheDocument();
    expect(screen.getByText(/Member listing and removal actions are not available/)).toBeInTheDocument();
  });

  it("lets super admins create a workspace and switch to it", async () => {
    const refreshWorkspaces = vi.fn().mockResolvedValue(undefined);
    const setSelectedWorkspaceId = vi.fn();

    mocks.useAuth.mockReturnValue({
      user: { id: "super-1", email: "super@example.com", role: "SUPER_ADMIN" },
    });
    mocks.useWorkspace.mockReturnValue(
      baseWorkspaceState({
        refreshWorkspaces,
        setSelectedWorkspaceId,
        currentWorkspaceRole: "SUPER_ADMIN",
        canSwitchWorkspaces: true,
      })
    );
    mocks.createWorkspace.mockResolvedValue({
      workspace: {
        id: "ws-3",
        name: "Northwind Analytics",
        slug: "northwind-analytics",
        createdAt: "2026-03-28T10:00:00.000Z",
        createdByUserId: "super-1",
      },
    });

    render(<AdminWorkspacePage />);

    fireEvent.change(screen.getByLabelText("Workspace name"), {
      target: { value: "Northwind Analytics" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() => {
      expect(mocks.createWorkspace).toHaveBeenCalledWith({ name: "Northwind Analytics" });
    });
    expect(refreshWorkspaces).toHaveBeenCalled();
    expect(setSelectedWorkspaceId).toHaveBeenCalledWith("ws-3");
    expect(await screen.findByText("Workspace Northwind Analytics created.")).toBeInTheDocument();
  });

  it("shows the safe no-workspace state while still exposing supported super-admin actions", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "super-1", email: "super@example.com", role: "SUPER_ADMIN" },
    });
    mocks.useWorkspace.mockReturnValue(
      baseWorkspaceState({
        workspaces: [],
        currentWorkspace: null,
        currentWorkspaceRole: null,
        selectedWorkspaceId: null,
        canSwitchWorkspaces: true,
      })
    );

    render(<AdminWorkspacePage />);

    expect(screen.getByText("No workspaces are available for this account yet.")).toBeInTheDocument();
    expect(screen.getByText("No workspace is currently available for this account.")).toBeInTheDocument();
    expect(screen.getByText("No workspace is available for member management.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create workspace" })).toBeInTheDocument();
  });
});
