import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppShell from "../AppShell";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useWorkspace: vi.fn(),
  setTrackingWorkspace: vi.fn(),
  track: vi.fn(),
  trackPageView: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../context/auth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../../context/workspace", () => ({
  useWorkspace: mocks.useWorkspace,
}));

vi.mock("../../lib/track", () => ({
  setTrackingWorkspace: mocks.setTrackingWorkspace,
  track: mocks.track,
  trackPageView: mocks.trackPageView,
}));

afterEach(() => {
  vi.resetAllMocks();
});

function renderShell(path = "/admin/products") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    </MemoryRouter>
  );
}

function buildWorkspaceState(overrides: Record<string, unknown> = {}) {
  const currentWorkspace =
    overrides.currentWorkspace === undefined
      ? {
          id: "ws-1",
          name: "Northwind",
          slug: "northwind",
          role: "WORKSPACE_ADMIN",
        }
      : overrides.currentWorkspace;

  return {
    workspaces: [
      {
        id: "ws-1",
        name: "Northwind",
        slug: "northwind",
        role: "WORKSPACE_ADMIN",
      },
    ],
    currentWorkspace,
    currentWorkspaceRole: currentWorkspace ? "WORKSPACE_ADMIN" : null,
    selectedWorkspaceId: currentWorkspace ? "ws-1" : null,
    setSelectedWorkspaceId: vi.fn(),
    loading: false,
    ...overrides,
  };
}

describe("AppShell", () => {
  it("shows role-appropriate navigation for workspace viewers", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "viewer-1", email: "viewer@example.com", role: "WORKSPACE_VIEWER" },
      logout: mocks.logout,
    });
    mocks.useWorkspace.mockReturnValue({
      ...buildWorkspaceState({
        currentWorkspace: {
          id: "ws-1",
          name: "Northwind",
          slug: "northwind",
          role: "WORKSPACE_VIEWER",
        },
        currentWorkspaceRole: "WORKSPACE_VIEWER",
        workspaces: [
          {
            id: "ws-1",
            name: "Northwind",
            slug: "northwind",
            role: "WORKSPACE_VIEWER",
          },
        ],
      }),
    });

    renderShell("/admin/events");

    expect(screen.getAllByText("Workspace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Analytics").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Products").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Events").length).toBeGreaterThan(0);
    expect(screen.queryByText("Audit Logs")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("shows management navigation for workspace-managing roles", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
      logout: mocks.logout,
    });
    mocks.useWorkspace.mockReturnValue(buildWorkspaceState());

    renderShell("/admin/settings");

    expect(screen.getAllByText("Audit Logs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("blocks tenant pages until a workspace is selected", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
      logout: mocks.logout,
    });
    mocks.useWorkspace.mockReturnValue(buildWorkspaceState({ currentWorkspace: null, currentWorkspaceRole: null, selectedWorkspaceId: null }));

    renderShell("/admin/products");

    expect(screen.getByText("No workspace is available for this account.")).toBeInTheDocument();
    expect(screen.queryByText("Shell content")).not.toBeInTheDocument();
  });

  it("keeps the workspace page accessible without a selected workspace", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
      logout: mocks.logout,
    });
    mocks.useWorkspace.mockReturnValue(buildWorkspaceState({ currentWorkspace: null, currentWorkspaceRole: null, selectedWorkspaceId: null }));

    renderShell("/admin/workspace");

    expect(screen.getByText("Shell content")).toBeInTheDocument();
    expect(screen.queryByText("No workspace is available for this account.")).not.toBeInTheDocument();
  });
});
