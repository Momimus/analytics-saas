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
  canManageWorkspace: (user: { role?: string } | null) =>
    user?.role === "SUPER_ADMIN" || user?.role === "WORKSPACE_ADMIN",
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

describe("AppShell", () => {
  it("shows role-appropriate navigation for workspace viewers", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "viewer-1", email: "viewer@example.com", role: "WORKSPACE_VIEWER" },
      logout: mocks.logout,
    });
    mocks.useWorkspace.mockReturnValue({
      workspaces: [
        {
          id: "ws-1",
          name: "Northwind",
          slug: "northwind",
          role: "WORKSPACE_VIEWER",
        },
      ],
      selectedWorkspaceId: "ws-1",
      setSelectedWorkspaceId: vi.fn(),
      loading: false,
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
    mocks.useWorkspace.mockReturnValue({
      workspaces: [
        {
          id: "ws-1",
          name: "Northwind",
          slug: "northwind",
          role: "WORKSPACE_ADMIN",
        },
      ],
      selectedWorkspaceId: "ws-1",
      setSelectedWorkspaceId: vi.fn(),
      loading: false,
    });

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
    mocks.useWorkspace.mockReturnValue({
      workspaces: [
        {
          id: "ws-1",
          name: "Northwind",
          slug: "northwind",
          role: "WORKSPACE_ADMIN",
        },
      ],
      selectedWorkspaceId: null,
      setSelectedWorkspaceId: vi.fn(),
      loading: false,
    });

    renderShell("/admin/products");

    expect(screen.getByText("Select a workspace to load tenant data.")).toBeInTheDocument();
    expect(screen.queryByText("Shell content")).not.toBeInTheDocument();
  });

  it("keeps the workspace page accessible without a selected workspace", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
      logout: mocks.logout,
    });
    mocks.useWorkspace.mockReturnValue({
      workspaces: [
        {
          id: "ws-1",
          name: "Northwind",
          slug: "northwind",
          role: "WORKSPACE_ADMIN",
        },
      ],
      selectedWorkspaceId: null,
      setSelectedWorkspaceId: vi.fn(),
      loading: false,
    });

    renderShell("/admin/workspace");

    expect(screen.getByText("Shell content")).toBeInTheDocument();
    expect(screen.queryByText("Select a workspace to load tenant data.")).not.toBeInTheDocument();
  });
});
