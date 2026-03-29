import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useWorkspace: vi.fn(),
}));

vi.mock("../../context/auth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../../context/workspace", () => ({
  useWorkspace: mocks.useWorkspace,
}));

vi.mock("../../components/AppShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../pages/Login", () => ({ default: () => <div>Login page</div> }));
vi.mock("../../pages/Register", () => ({ default: () => <div>Register page</div> }));
vi.mock("../../pages/Profile", () => ({ default: () => <div>Profile page</div> }));
vi.mock("../../pages/ForgotPassword", () => ({ default: () => <div>Forgot page</div> }));
vi.mock("../../pages/ResetPassword", () => ({ default: () => <div>Reset page</div> }));
vi.mock("../../pages/AdminAnalytics", () => ({ default: () => <div>Analytics page</div> }));
vi.mock("../../pages/AdminProducts", () => ({ default: () => <div>Products page</div> }));
vi.mock("../../pages/AdminOrders", () => ({ default: () => <div>Orders page</div> }));
vi.mock("../../pages/AdminEvents", () => ({ default: () => <div>Events page</div> }));
vi.mock("../../pages/AdminAuditLogs", () => ({ default: () => <div>Audit page</div> }));
vi.mock("../../pages/AdminSettings", () => ({ default: () => <div>Settings page</div> }));
vi.mock("../../pages/AdminUsers", () => ({ default: () => <div>Users page</div> }));
vi.mock("../../pages/AdminWorkspace", () => ({ default: () => <div>Workspace page</div> }));
vi.mock("../../pages/NotFound404", () => ({ default: () => <div>Not found</div> }));

afterEach(() => {
  vi.resetAllMocks();
});

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("App RBAC routes", () => {
  it("renders the users page for super admins", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "super-1", email: "super@example.com", role: "SUPER_ADMIN" },
      loading: false,
    });
    mocks.useWorkspace.mockReturnValue({ selectedWorkspaceId: "ws-1" });

    renderApp("/admin/users");

    expect(await screen.findByText("Users page")).toBeInTheDocument();
  });

  it("shows access denied when a viewer opens settings", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "viewer-1", email: "viewer@example.com", role: "WORKSPACE_VIEWER" },
      loading: false,
    });
    mocks.useWorkspace.mockReturnValue({ selectedWorkspaceId: "ws-1" });

    renderApp("/admin/settings");

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.getByText(/Current role:/)).toBeInTheDocument();
    expect(screen.getByText(/WORKSPACE_VIEWER/)).toBeInTheDocument();
  });

  it("shows access denied when a workspace admin opens the users page", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
      loading: false,
    });
    mocks.useWorkspace.mockReturnValue({ selectedWorkspaceId: "ws-1" });

    renderApp("/admin/users");

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.getByText(/SUPER_ADMIN/)).toBeInTheDocument();
  });
});
