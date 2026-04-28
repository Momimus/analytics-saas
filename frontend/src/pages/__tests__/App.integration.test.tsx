import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { AuthProvider } from "../../context/auth";
import { WorkspaceProvider } from "../../context/workspace";
import { ThemeProvider } from "../../context/theme";

const trackMocks = vi.hoisted(() => ({
  track: vi.fn().mockResolvedValue(undefined),
  setTrackingWorkspace: vi.fn(),
  trackPageView: vi.fn(),
}));

vi.mock("../../lib/track", () => ({
  track: trackMocks.track,
  setTrackingWorkspace: trackMocks.setTrackingWorkspace,
  trackPageView: trackMocks.trackPageView,
}));

vi.mock("../../pages/AdminAnalytics", () => ({
  default: () => <div>Analytics landing</div>,
}));

const WORKSPACE_STORAGE_KEY = "selectedWorkspaceId";
const DEFAULT_USER = { id: "user-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" as const };
const DEFAULT_WORKSPACES = [
  {
    id: "ws-1",
    name: "Northwind",
    slug: "northwind",
    createdAt: "2026-03-28T10:00:00.000Z",
    createdByUserId: "user-1",
    role: "WORKSPACE_ADMIN" as const,
  },
];

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function installFetchMock(
  handler: (request: { url: URL; method: string; headers: Headers; body: string | null }) => Promise<Response>
) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    return handler({
      url: new URL(rawUrl),
      method: (init?.method ?? "GET").toUpperCase(),
      headers: new Headers(init?.headers ?? {}),
      body: typeof init?.body === "string" ? init.body : null,
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function installAuthenticatedFetchMock(
  handler: (request: { url: URL; method: string; headers: Headers; body: string | null }) => Promise<Response>
) {
  return installFetchMock(async (request) => {
    if (request.url.pathname === "/me" && request.method === "GET") {
      return jsonResponse({ user: DEFAULT_USER });
    }
    if (request.url.pathname === "/me/workspaces" && request.method === "GET") {
      return jsonResponse({ workspaces: DEFAULT_WORKSPACES });
    }
    if (request.url.pathname === "/auth/csrf" && request.method === "GET") {
      return jsonResponse({ csrfToken: "csrf-token-app" });
    }
    return handler(request);
  });
}

function renderIntegratedApp(initialEntry: string) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <App />
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("App browser-level integration flows", () => {
  it("completes login and lands in the authenticated app with workspace context", async () => {
    let meCalls = 0;

    installFetchMock(async ({ url, method, headers, body }) => {
      if (url.pathname === "/me" && method === "GET") {
        meCalls += 1;
        if (meCalls === 1) {
          return jsonResponse({ message: "Unauthorized" }, 401);
        }
        return jsonResponse({
          user: { id: "user-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
        });
      }
      if (url.pathname === "/auth/csrf" && method === "GET") {
        return jsonResponse({ csrfToken: "csrf-token-1" });
      }
      if (url.pathname === "/auth/login" && method === "POST") {
        expect(headers.get("x-csrf-token")).toBe("csrf-token-1");
        expect(body).toContain('"email":"admin@example.com"');
        expect(body).toContain('"password":"secret-pass"');
        return jsonResponse({ ok: true });
      }
      if (url.pathname === "/me/workspaces" && method === "GET") {
        return jsonResponse({
          workspaces: [
            {
              id: "ws-1",
              name: "Northwind",
              slug: "northwind",
              createdAt: "2026-03-28T10:00:00.000Z",
              createdByUserId: "user-1",
              role: "WORKSPACE_ADMIN",
            },
          ],
        });
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/login");

    fireEvent.change(await screen.findByLabelText("Email"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect((await screen.findAllByText("Northwind")).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe("ws-1");
    });
  });

  it("redirects protected routes to login when no authenticated session exists", async () => {
    installFetchMock(async ({ url, method }) => {
      if (url.pathname === "/me" && method === "GET") {
        return jsonResponse({ message: "Unauthorized" }, 401);
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/admin/settings");

    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("loads workspace management and lets a super admin switch workspace context", async () => {
    installFetchMock(async ({ url, method }) => {
      if (url.pathname === "/me" && method === "GET") {
        return jsonResponse({
          user: { id: "super-1", email: "super@example.com", role: "SUPER_ADMIN" },
        });
      }
      if (url.pathname === "/me/workspaces" && method === "GET") {
        return jsonResponse({
          workspaces: [
            {
              id: "ws-1",
              name: "Northwind",
              slug: "northwind",
              createdAt: "2026-03-28T10:00:00.000Z",
              createdByUserId: "user-1",
              role: "SUPER_ADMIN",
            },
            {
              id: "ws-2",
              name: "Acme",
              slug: "acme",
              createdAt: "2026-03-28T11:00:00.000Z",
              createdByUserId: "user-2",
              role: "SUPER_ADMIN",
            },
          ],
        });
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/admin/workspace");

    expect((await screen.findAllByText("Northwind")).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe("ws-1");
    });

    fireEvent.click(screen.getByRole("button", { name: /Acme/ }));

    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe("ws-2");
    });
    expect(screen.getAllByText("Platform Access").length).toBeGreaterThan(0);
  });

  it("loads and saves workspace settings with workspace and csrf headers", async () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "ws-1");
    let settingsPatched = false;

    installFetchMock(async ({ url, method, headers, body }) => {
      if (url.pathname === "/me" && method === "GET") {
        return jsonResponse({
          user: { id: "user-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
        });
      }
      if (url.pathname === "/me/workspaces" && method === "GET") {
        return jsonResponse({
          workspaces: [
            {
              id: "ws-1",
              name: "Northwind",
              slug: "northwind",
              createdAt: "2026-03-28T10:00:00.000Z",
              createdByUserId: "user-1",
              role: "WORKSPACE_ADMIN",
            },
          ],
        });
      }
      if (url.pathname === "/admin/settings" && method === "GET") {
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        return jsonResponse({
          settings: {
            workspaceId: "ws-1",
            displayName: "Northwind Workspace",
            updatedAt: "2026-03-28T10:00:00.000Z",
          },
        });
      }
      if (url.pathname === "/auth/csrf" && method === "GET") {
        return jsonResponse({ csrfToken: "csrf-token-2" });
      }
      if (url.pathname === "/admin/settings" && method === "PATCH") {
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        expect(headers.get("x-csrf-token")).toBeTruthy();
        expect(body).toContain('"displayName":"Team Alpha"');
        settingsPatched = true;
        return jsonResponse({
          settings: {
            workspaceId: "ws-1",
            displayName: "Team Alpha",
            updatedAt: "2026-03-28T11:00:00.000Z",
          },
        });
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/admin/settings");

    const input = await screen.findByLabelText("Workspace display name");
    fireEvent.change(input, { target: { value: "Team Alpha" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(settingsPatched).toBe(true);
    });
    expect(await screen.findByDisplayValue("Team Alpha")).toBeInTheDocument();
    expect(trackMocks.track).toHaveBeenCalledWith("settings_updated", { metadata: { section: "workspace" } });
  });

  it("submits the supported workspace member upsert flow with workspace context", async () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "ws-1");
    let memberUpserted = false;

    installFetchMock(async ({ url, method, headers, body }) => {
      if (url.pathname === "/me" && method === "GET") {
        return jsonResponse({
          user: { id: "user-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
        });
      }
      if (url.pathname === "/me/workspaces" && method === "GET") {
        return jsonResponse({
          workspaces: [
            {
              id: "ws-1",
              name: "Northwind",
              slug: "northwind",
              createdAt: "2026-03-28T10:00:00.000Z",
              createdByUserId: "user-1",
              role: "WORKSPACE_ADMIN",
            },
          ],
        });
      }
      if (url.pathname === "/auth/csrf" && method === "GET") {
        return jsonResponse({ csrfToken: "csrf-token-3" });
      }
      if (url.pathname === "/workspaces/ws-1/members" && method === "POST") {
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        expect(headers.get("x-csrf-token")).toBeTruthy();
        expect(body).toContain('"email":"teammate@company.com"');
        expect(body).toContain('"role":"WORKSPACE_VIEWER"');
        memberUpserted = true;
        return jsonResponse({
          member: {
            id: "member-1",
            workspaceId: "ws-1",
            userId: "user-22",
            role: "WORKSPACE_VIEWER",
            createdAt: "2026-03-28T12:00:00.000Z",
          },
        });
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/admin/workspace");

    fireEvent.change(await screen.findByLabelText("Member email"), {
      target: { value: "teammate@company.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add or update member" }));

    await waitFor(() => {
      expect(memberUpserted).toBe(true);
    });
    expect(await screen.findByLabelText("Member email")).toHaveValue("");
  });

  it("loads audit logs for an allowed role using the selected workspace context", async () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "ws-1");

    installFetchMock(async ({ url, method, headers }) => {
      if (url.pathname === "/me" && method === "GET") {
        return jsonResponse({
          user: { id: "user-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
        });
      }
      if (url.pathname === "/me/workspaces" && method === "GET") {
        return jsonResponse({
          workspaces: [
            {
              id: "ws-1",
              name: "Northwind",
              slug: "northwind",
              createdAt: "2026-03-28T10:00:00.000Z",
              createdByUserId: "user-1",
              role: "WORKSPACE_ADMIN",
            },
          ],
        });
      }
      if (url.pathname === "/admin/audit-logs" && method === "GET") {
        expect(url.searchParams.get("page")).toBe("1");
        expect(url.searchParams.get("pageSize")).toBe("20");
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        return jsonResponse({
          logs: [
            {
              id: "log-1",
              workspaceId: "ws-1",
              actorId: "user-1",
              actorRole: "WORKSPACE_ADMIN",
              action: "settings.updated",
              entityType: "workspace_settings",
              entityId: "ws-1",
              metadata: null,
              ip: "127.0.0.1",
              userAgent: "vitest",
              createdAt: "2026-03-28T12:30:00.000Z",
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        });
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/admin/audit-logs");

    expect((await screen.findAllByText("settings.updated")).length).toBeGreaterThan(0);
    expect(screen.getByText("Visible Entries")).toBeInTheDocument();
  });

  it("creates a product through the real app flow with workspace-scoped requests", async () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "ws-1");
    let created = false;
    let productListCalls = 0;

    installAuthenticatedFetchMock(async ({ url, method, headers, body }) => {
      if (url.pathname === "/admin/products" && method === "GET") {
        productListCalls += 1;
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        return jsonResponse({
          products: created
            ? [
                {
                    id: "prod-1",
                    name: "Growth",
                    isActive: true,
                    createdAt: "2026-03-28T12:00:00.000Z",
                    _count: { orders: 0, events: 0 },
                  },
              ]
            : [],
          nextCursor: null,
        });
      }
      if (url.pathname === "/admin/products" && method === "POST") {
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        expect(headers.get("x-csrf-token")).toBeTruthy();
        expect(body).toContain('"name":"Growth"');
        expect(body).toContain('"price":99');
        created = true;
        return jsonResponse({
          product: {
            id: "prod-1",
            name: "Growth",
            isActive: true,
            createdAt: "2026-03-28T12:00:00.000Z",
          },
        });
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/admin/products");

    expect(await screen.findByText("No products yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Product name"), { target: { value: "Growth" } });
    fireEvent.change(within(dialog).getByLabelText("Price"), { target: { value: "99" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(created).toBe(true);
      expect(productListCalls).toBeGreaterThanOrEqual(2);
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("archives a product through the real app flow and refreshes the list", async () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "ws-1");
    let archived = false;
    let productListCalls = 0;

    installAuthenticatedFetchMock(async ({ url, method, headers }) => {
      if (url.pathname === "/admin/products" && method === "GET") {
        productListCalls += 1;
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        return jsonResponse({
          products: archived
            ? []
            : [
                {
                  id: "prod-1",
                  name: "Starter",
                  isActive: true,
                  createdAt: "2026-03-28T12:00:00.000Z",
                  _count: { orders: 2, events: 3 },
                },
              ],
          nextCursor: null,
        });
      }
      if (url.pathname === "/admin/products/prod-1" && method === "DELETE") {
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        expect(headers.get("x-csrf-token")).toBeTruthy();
        archived = true;
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/admin/products");

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Archive" }));

    await waitFor(() => {
      expect(archived).toBe(true);
      expect(productListCalls).toBeGreaterThanOrEqual(2);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("creates an order through the real app flow and refreshes the table", async () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "ws-1");
    let created = false;
    let orderListCalls = 0;

    installAuthenticatedFetchMock(async ({ url, method, headers, body }) => {
      if (url.pathname === "/admin/orders" && method === "GET") {
        orderListCalls += 1;
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        return jsonResponse({
          orders: created
            ? [
                {
                  id: "order-12345678",
                  createdAt: "2026-03-28T12:00:00.000Z",
                  productId: "prod-1",
                  amount: 49,
                  status: "completed",
                  product: { id: "prod-1", name: "Starter" },
                  _count: { events: 1 },
                },
              ]
            : [],
          nextCursor: null,
        });
      }
      if (url.pathname === "/admin/products" && method === "GET" && url.searchParams.get("limit") === "50") {
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        return jsonResponse({
          products: [
            {
              id: "prod-1",
              name: "Starter",
              isActive: true,
              createdAt: "2026-03-28T12:00:00.000Z",
              _count: { orders: 0, events: 0 },
            },
          ],
          nextCursor: null,
        });
      }
      if (url.pathname === "/admin/orders" && method === "POST") {
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        expect(headers.get("x-csrf-token")).toBeTruthy();
        expect(body).toContain('"productId":"prod-1"');
        expect(body).toContain('"amount":49');
        created = true;
        return jsonResponse({
          order: {
            id: "order-12345678",
            productId: "prod-1",
            amount: 49,
            status: "completed",
            createdAt: "2026-03-28T12:00:00.000Z",
          },
        });
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/admin/orders");

    expect(await screen.findByText("No orders yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create order" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Select a product" }));
    await within(dialog).findByPlaceholderText("Search products");
    fireEvent.click((await within(dialog).findAllByText("Starter"))[0]!);
    fireEvent.change(within(dialog).getByLabelText("Order total"), { target: { value: "49" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(created).toBe(true);
      expect(orderListCalls).toBeGreaterThanOrEqual(2);
      expect(trackMocks.track).toHaveBeenCalledWith("order_created", {
        orderId: "order-12345678",
        productId: "prod-1",
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("refunds an order through the real app flow and shows the updated status", async () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "ws-1");
    let refunded = false;

    installAuthenticatedFetchMock(async ({ url, method, headers, body }) => {
      if (url.pathname === "/admin/orders" && method === "GET") {
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        return jsonResponse({
          orders: [
            {
              id: "order-12345678",
              createdAt: "2026-03-28T12:00:00.000Z",
              productId: "prod-1",
              amount: 49,
              status: refunded ? "refunded" : "completed",
              product: { id: "prod-1", name: "Starter" },
              _count: { events: 1 },
            },
          ],
          nextCursor: null,
        });
      }
      if (url.pathname === "/admin/orders/order-12345678/status" && method === "PATCH") {
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        expect(headers.get("x-csrf-token")).toBeTruthy();
        expect(body).toContain('"status":"refunded"');
        refunded = true;
        return jsonResponse({
          order: {
            id: "order-12345678",
            productId: "prod-1",
            amount: 49,
            status: "refunded",
            createdAt: "2026-03-28T12:00:00.000Z",
          },
        });
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/admin/orders");

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Refund" })[0]!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm" }));

    expect((await screen.findAllByText("refunded")).length).toBeGreaterThan(0);
  });

  it("surfaces refund failures without losing the current order state", async () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "ws-1");
    let orderListCalls = 0;
    let refundAttempts = 0;

    installAuthenticatedFetchMock(async ({ url, method, headers, body }) => {
      if (url.pathname === "/admin/orders" && method === "GET") {
        orderListCalls += 1;
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        return jsonResponse({
          orders: [
            {
              id: "order-12345678",
              createdAt: "2026-03-28T12:00:00.000Z",
              productId: "prod-1",
              amount: 49,
              status: "completed",
              product: { id: "prod-1", name: "Starter" },
              _count: { events: 1 },
            },
          ],
          nextCursor: null,
        });
      }
      if (url.pathname === "/admin/orders/order-12345678/status" && method === "PATCH") {
        refundAttempts += 1;
        expect(headers.get("x-workspace-id")).toBe("ws-1");
        expect(headers.get("x-csrf-token")).toBeTruthy();
        expect(body).toContain('"status":"refunded"');
        return jsonResponse({ message: "Unable to update order status." }, 500);
      }
      throw new Error(`Unhandled request: ${method} ${url.pathname}${url.search}`);
    });

    renderIntegratedApp("/admin/orders");

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Refund" })[0]!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(refundAttempts).toBe(1);
      expect(orderListCalls).toBe(1);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getAllByText("completed").length).toBeGreaterThan(0);
    });
  });
});

