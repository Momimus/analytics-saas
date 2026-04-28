import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminAnalyticsPage from "../AdminAnalytics";

const mocks = vi.hoisted(() => ({
  useWorkspace: vi.fn(),
}));

vi.mock("../../context/workspace", () => ({
  useWorkspace: mocks.useWorkspace,
}));

vi.mock("../../components/analytics/AnalyticsMetricCard", () => ({
  default: ({ label, value, loading }: { label: string; value: string; loading?: boolean }) => (
    <div>{label}: {loading ? "loading" : value}</div>
  ),
}));

vi.mock("../../components/analytics/RevenueTrendChart", () => ({
  default: ({ data }: { data: Array<{ label: string; value: number }> }) => <div>Revenue chart {data.length}</div>,
}));

vi.mock("../../components/analytics/OrdersCategoryChart", () => ({
  default: ({ data }: { data: Array<{ label: string; value: number }> }) => <div>Orders chart {data.length}</div>,
}));

vi.mock("../../components/analytics/ProductPerformanceChart", () => ({
  default: ({ data }: { data: Array<{ label: string; orders: number; events: number }> }) => <div>Product chart {data.length}</div>,
}));

vi.mock("../../components/analytics/RecentOrdersTable", () => ({
  default: ({ rows, loading }: { rows: unknown[]; loading?: boolean }) => <div>Recent orders {loading ? "loading" : rows.length}</div>,
}));

vi.mock("../../components/analytics/AnalyticsInsightList", () => ({
  default: ({ items, loading }: { items: Array<{ title: string }>; loading?: boolean }) => (
    <div>Insights {loading ? "loading" : items.length}</div>
  ),
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("AdminAnalyticsPage workspace-scoped integration", () => {
  it("loads viewer-safe analytics requests with the selected workspace header", async () => {
    window.localStorage.setItem("selectedWorkspaceId", "ws-viewer");
    mocks.useWorkspace.mockReturnValue({ selectedWorkspaceId: "ws-viewer" });

    const requests: Array<{ path: string; workspaceId: string | null }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(rawUrl);
      const headers = new Headers(init?.headers ?? {});
      requests.push({ path: `${url.pathname}${url.search}`, workspaceId: headers.get("x-workspace-id") });

      if (url.pathname === "/admin/analytics/overview") {
        return jsonResponse({
          revenue: 1200,
          orders: 12,
          activeUsers: 5,
          conversionRate: 0.24,
          prior: { revenue: 800, orders: 8, activeUsers: 4, conversionRate: 0.2 },
          deltas: { revenueDeltaPct: 50, ordersDeltaPct: 50, activeUsersDeltaPct: 25, conversionDeltaPts: 4 },
        });
      }
      if (url.pathname === "/admin/analytics/trends" && url.searchParams.get("metric") === "revenue") {
        return jsonResponse({ labels: ["2026-03-27"], data: [1200] });
      }
      if (url.pathname === "/admin/analytics/trends" && url.searchParams.get("metric") === "orders") {
        return jsonResponse({ labels: ["2026-03-27"], data: [12] });
      }
      if (url.pathname === "/admin/analytics/activity") {
        return jsonResponse({
          events: [
            {
              id: "evt-1",
              eventName: "order_created",
              actorLabel: "Alice",
              userId: "user-1",
              createdAt: "2026-03-28T10:00:00.000Z",
              productId: "prod-1",
              orderId: "ord-1",
              metadata: { source: "ui" },
            },
          ],
          nextCursor: null,
        });
      }
      if (url.pathname === "/admin/products") {
        return jsonResponse({
          products: [
            { id: "prod-1", name: "Starter", isActive: true, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 3, events: 4 } },
          ],
          nextCursor: null,
        });
      }
      if (url.pathname === "/admin/orders") {
        return jsonResponse({
          orders: [
            { id: "ord-1", createdAt: "2026-03-28T10:00:00.000Z", amount: 120, status: "completed", productId: "prod-1", product: { id: "prod-1", name: "Starter" }, _count: { events: 2 } },
          ],
          nextCursor: null,
        });
      }

      throw new Error(`Unhandled request: ${url.pathname}${url.search}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/admin/analytics?range=30d"]}>
        <AdminAnalyticsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Total Revenue: $1,200")).toBeInTheDocument();
    expect(screen.getByText("Recent orders 1")).toBeInTheDocument();
    expect(screen.getByText("Insights 3")).toBeInTheDocument();

    await waitFor(() => {
      expect(requests).toHaveLength(6);
      expect(requests.every((request) => request.workspaceId === "ws-viewer")).toBe(true);
    });
  });
});
