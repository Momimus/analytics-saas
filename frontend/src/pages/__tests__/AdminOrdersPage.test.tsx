import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminOrdersPage from "../AdminOrders";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  canManageWorkspace: vi.fn(),
  listAdminOrders: vi.fn(),
  listAdminProducts: vi.fn(),
  updateAdminOrderStatus: vi.fn(),
  apiFetch: vi.fn(),
  track: vi.fn(),
}));

vi.mock("../../context/auth", () => ({
  useAuth: mocks.useAuth,
  canManageWorkspace: mocks.canManageWorkspace,
}));

vi.mock("../../api/adminAnalytics", () => ({
  listAdminOrders: mocks.listAdminOrders,
  listAdminProducts: mocks.listAdminProducts,
  updateAdminOrderStatus: mocks.updateAdminOrderStatus,
}));

vi.mock("../../lib/api", () => ({
  apiFetch: mocks.apiFetch,
}));

vi.mock("../../lib/track", () => ({
  track: mocks.track,
}));

afterEach(() => {
  vi.resetAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminOrdersPage />
    </MemoryRouter>
  );
}

describe("AdminOrdersPage", () => {
  it("renders orders and shows mutating actions for workspace-managing roles", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
    });
    mocks.canManageWorkspace.mockReturnValue(true);
    mocks.listAdminOrders.mockResolvedValue({
      orders: [
        {
          id: "order-12345678",
          createdAt: "2026-03-28T10:00:00.000Z",
          productId: "product-1",
          amount: 49,
          status: "completed",
          product: { id: "product-1", name: "Starter" },
          _count: { events: 2 },
        },
      ],
      nextCursor: null,
    });

    renderPage();

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("completed").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Create order" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Refund" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Cancel" }).length).toBeGreaterThan(0);
  });

  it("hides mutating actions for viewer users and shows the empty state", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "viewer-1", email: "viewer@example.com", role: "WORKSPACE_VIEWER" },
    });
    mocks.canManageWorkspace.mockReturnValue(false);
    mocks.listAdminOrders.mockResolvedValue({
      orders: [],
      nextCursor: null,
    });

    renderPage();

    expect(await screen.findByText("No orders yet.")).toBeInTheDocument();
    expect(screen.getByText("Read-only access")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refund" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("applies search after debounce and shows the filtered empty state", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
    });
    mocks.canManageWorkspace.mockReturnValue(true);
    mocks.listAdminOrders
      .mockResolvedValueOnce({
        orders: [
          {
            id: "order-12345678",
            createdAt: "2026-03-28T10:00:00.000Z",
            productId: "product-1",
            amount: 49,
            status: "completed",
            product: { id: "product-1", name: "Starter" },
            _count: { events: 2 },
          },
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        orders: [],
        nextCursor: null,
      });

    renderPage();

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText("Search orders"), {
      target: { value: "missing" },
    });

    await waitFor(() => {
      expect(mocks.listAdminOrders).toHaveBeenLastCalledWith({
        limit: 25,
        q: "missing",
      });
    });
    expect(await screen.findByText("No orders match your search.")).toBeInTheDocument();
  });

  it("shows the error state and retries loading orders", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
    });
    mocks.canManageWorkspace.mockReturnValue(true);
    mocks.listAdminOrders
      .mockRejectedValueOnce(new Error("Orders failed"))
      .mockResolvedValueOnce({
        orders: [
          {
            id: "order-12345678",
            createdAt: "2026-03-28T10:00:00.000Z",
            productId: "product-1",
            amount: 49,
            status: "completed",
            product: { id: "product-1", name: "Recovered" },
            _count: { events: 1 },
          },
        ],
        nextCursor: null,
      });

    renderPage();

    expect(await screen.findByText("Orders failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect((await screen.findAllByText("Recovered")).length).toBeGreaterThan(0);
    expect(mocks.listAdminOrders).toHaveBeenCalledTimes(2);
  });
});
