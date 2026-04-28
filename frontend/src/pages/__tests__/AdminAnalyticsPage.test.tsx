import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminAnalyticsPage from "../AdminAnalytics";

const mocks = vi.hoisted(() => ({
  getOverview: vi.fn(),
  getTrends: vi.fn(),
  getActivity: vi.fn(),
  listAdminProducts: vi.fn(),
  listAdminOrders: vi.fn(),
  useWorkspace: vi.fn(),
}));

vi.mock("../../api/adminAnalytics", async () => {
  const actual = await vi.importActual<typeof import("../../api/adminAnalytics")>("../../api/adminAnalytics");
  return {
    ...actual,
    getOverview: mocks.getOverview,
    getTrends: mocks.getTrends,
    getActivity: mocks.getActivity,
    listAdminProducts: mocks.listAdminProducts,
    listAdminOrders: mocks.listAdminOrders,
  };
});

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

afterEach(() => {
  vi.clearAllMocks();
});

function renderPage(initialEntry = "/admin/analytics?range=30d") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AdminAnalyticsPage />
    </MemoryRouter>
  );
}

describe("AdminAnalyticsPage", () => {
  it("shows loading markers first and then renders analytics data", async () => {
    let resolveAll!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveAll = resolve;
    });

    mocks.useWorkspace.mockReturnValue({ selectedWorkspaceId: "ws-1" });
    mocks.getOverview.mockImplementation(() => pending.then(() => ({
      revenue: 1200,
      orders: 12,
      activeUsers: 5,
      conversionRate: 0.24,
      prior: { revenue: 800, orders: 8, activeUsers: 4, conversionRate: 0.2 },
      deltas: { revenueDeltaPct: 50, ordersDeltaPct: 50, activeUsersDeltaPct: 25, conversionDeltaPts: 4 },
    })));
    mocks.getTrends
      .mockImplementationOnce(() => pending.then(() => ({ labels: ["2026-03-27"], data: [1200] })))
      .mockImplementationOnce(() => pending.then(() => ({ labels: ["2026-03-27"], data: [12] })));
    mocks.getActivity.mockImplementation(() => pending.then(() => ({
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
    })));
    mocks.listAdminProducts.mockImplementation(() => pending.then(() => ({
      products: [{ id: "prod-1", name: "Starter", isActive: true, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 3, events: 4 } }],
      nextCursor: null,
    })));
    mocks.listAdminOrders.mockImplementation(() => pending.then(() => ({
      orders: [{ id: "ord-1", createdAt: "2026-03-28T10:00:00.000Z", amount: 120, status: "completed", productId: "prod-1", product: { id: "prod-1", name: "Starter" }, _count: { events: 2 } }],
      nextCursor: null,
    })));

    renderPage();

    expect(screen.getByText("Total Revenue: loading")).toBeInTheDocument();
    expect(screen.getByText("Recent orders loading")).toBeInTheDocument();
    expect(screen.getByText("Insights loading")).toBeInTheDocument();

    resolveAll();

    expect(await screen.findByText("Total Revenue: $1,200")).toBeInTheDocument();
    expect(screen.getByText("Recent orders 1")).toBeInTheDocument();
    expect(screen.getByText("Insights 3")).toBeInTheDocument();
    expect(screen.getByText("Revenue chart 1")).toBeInTheDocument();
    expect(screen.getByText("Product chart 1")).toBeInTheDocument();
  });

  it("shows empty-state copy when analytics data is present but charts and activity are empty", async () => {
    mocks.useWorkspace.mockReturnValue({ selectedWorkspaceId: "ws-1" });
    mocks.getOverview.mockResolvedValue({
      revenue: 0,
      orders: 0,
      activeUsers: 0,
      conversionRate: 0,
      prior: { revenue: 0, orders: 0, activeUsers: 0, conversionRate: 0 },
      deltas: { revenueDeltaPct: 0, ordersDeltaPct: 0, activeUsersDeltaPct: 0, conversionDeltaPts: 0 },
    });
    mocks.getTrends
      .mockResolvedValueOnce({ labels: ["2026-03-27"], data: [0] })
      .mockResolvedValueOnce({ labels: ["2026-03-27"], data: [0] });
    mocks.getActivity.mockResolvedValue({ events: [], nextCursor: null });
    mocks.listAdminProducts.mockResolvedValue({ products: [], nextCursor: null });
    mocks.listAdminOrders.mockResolvedValue({ orders: [], nextCursor: null });

    renderPage("/admin/analytics?range=7d&q=missing");

    expect(await screen.findByText("Revenue will appear here once completed orders start landing in this workspace.")).toBeInTheDocument();
    expect(screen.getByText("Order volume will appear here once your workspace starts generating transactions.")).toBeInTheDocument();
    expect(screen.getByText("Product performance will populate after products start receiving orders or tracked events.")).toBeInTheDocument();
    expect(screen.getByText("No activity rows match your search.")).toBeInTheDocument();
  });

  it("shows the error state and retries the analytics load", async () => {
    mocks.useWorkspace.mockReturnValue({ selectedWorkspaceId: "ws-1" });
    mocks.getOverview
      .mockRejectedValueOnce(new Error("Overview failed"))
      .mockResolvedValueOnce({
        revenue: 500,
        orders: 5,
        activeUsers: 2,
        conversionRate: 0.1,
        prior: { revenue: 250, orders: 3, activeUsers: 2, conversionRate: 0.08 },
        deltas: { revenueDeltaPct: 100, ordersDeltaPct: 66.7, activeUsersDeltaPct: 0, conversionDeltaPts: 2 },
      });
    mocks.getTrends
      .mockResolvedValue({ labels: ["2026-03-27"], data: [1] });
    mocks.getActivity.mockResolvedValue({ events: [], nextCursor: null });
    mocks.listAdminProducts.mockResolvedValue({ products: [], nextCursor: null });
    mocks.listAdminOrders.mockResolvedValue({ orders: [], nextCursor: null });

    renderPage();

    expect((await screen.findAllByText("Overview failed")).length).toBeGreaterThan(0);

    const retryButtons = screen.getAllByRole("button", { name: "Retry" });
    retryButtons[0]?.click();

    await waitFor(() => {
      expect(mocks.getOverview).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("Total Revenue: $500")).toBeInTheDocument();
  });

  it("does not request analytics data until a workspace is selected", async () => {
    mocks.useWorkspace.mockReturnValue({ selectedWorkspaceId: null });

    renderPage();

    await waitFor(() => {
      expect(mocks.getOverview).not.toHaveBeenCalled();
      expect(mocks.getTrends).not.toHaveBeenCalled();
      expect(mocks.getActivity).not.toHaveBeenCalled();
      expect(mocks.listAdminProducts).not.toHaveBeenCalled();
      expect(mocks.listAdminOrders).not.toHaveBeenCalled();
    });
  });
});
