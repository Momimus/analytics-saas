import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminOrdersPage from "../AdminOrders";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useWorkspace: vi.fn(),
  listAdminOrders: vi.fn(),
  listAdminProducts: vi.fn(),
  updateAdminOrderStatus: vi.fn(),
  apiFetch: vi.fn(),
  track: vi.fn(),
}));

vi.mock("../../context/auth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../../context/workspace", () => ({
  useWorkspace: mocks.useWorkspace,
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

function mockWorkspace(role: "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER") {
  mocks.useWorkspace.mockReturnValue({
    currentWorkspaceRole: role,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminOrdersPage />
    </MemoryRouter>
  );
}

describe("AdminOrdersPage", () => {
  it("creates an order, tracks it, and refreshes the list", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
    });
    mockWorkspace("WORKSPACE_ADMIN");
    mocks.listAdminOrders
      .mockResolvedValueOnce({
        orders: [],
        nextCursor: null,
      })
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
      });
    mocks.listAdminProducts.mockResolvedValue({
      products: [{ id: "product-1", name: "Starter", isActive: true, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 0, events: 0 } }],
      nextCursor: null,
    });
    mocks.apiFetch.mockResolvedValue({
      order: { id: "order-12345678", productId: "product-1" },
    });
    mocks.track.mockResolvedValue(undefined);

    renderPage();

    expect(await screen.findByText("No orders yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create order" }));
    const createDialog = screen.getByRole("dialog");
    fireEvent.click(within(createDialog).getByRole("button", { name: "Select a product" }));
    await within(createDialog).findByPlaceholderText("Search products");
    fireEvent.click((await within(createDialog).findAllByText("Starter"))[0]!);
    fireEvent.change(screen.getByLabelText("Order total"), { target: { value: "49" } });
    fireEvent.click(within(createDialog).getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mocks.apiFetch).toHaveBeenCalledWith("/admin/orders", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          productId: "product-1",
          amount: 49,
          status: "completed",
        }),
      }));
    });
    await waitFor(() => {
      expect(mocks.track).toHaveBeenCalledWith("order_created", {
        orderId: "order-12345678",
        productId: "product-1",
      });
    });
    expect(await screen.findByText("Created order order-12.")).toBeInTheDocument();
    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows validation and mapped product errors when create input is invalid", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
    });
    mockWorkspace("WORKSPACE_ADMIN");
    mocks.listAdminOrders.mockResolvedValue({
      orders: [],
      nextCursor: null,
    });
    mocks.listAdminProducts.mockResolvedValue({
      products: [{ id: "product-1", name: "Starter", isActive: true, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 0, events: 0 } }],
      nextCursor: null,
    });

    renderPage();

    expect(await screen.findByText("No orders yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create order" }));
    const createDialog = screen.getByRole("dialog");
    fireEvent.click(within(createDialog).getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Select a product from the list.")).toBeInTheDocument();
    expect(mocks.apiFetch).not.toHaveBeenCalled();

    fireEvent.click(within(createDialog).getByRole("button", { name: "Select a product" }));
    await within(createDialog).findByPlaceholderText("Search products");
    fireEvent.click((await within(createDialog).findAllByText("Starter"))[0]!);
    fireEvent.change(screen.getByLabelText("Order total"), { target: { value: "0" } });
    fireEvent.click(within(createDialog).getByRole("button", { name: "Create" }));

    expect((await screen.findAllByText("Order total must be a positive number.")).length).toBeGreaterThan(0);
    expect(mocks.apiFetch).not.toHaveBeenCalled();

    const notFoundError = new Error("Product not found");
    Object.assign(notFoundError, { code: "product_not_found" });
    mocks.apiFetch.mockRejectedValueOnce(notFoundError);

    fireEvent.change(screen.getByLabelText("Order total"), { target: { value: "49" } });
    fireEvent.click(within(createDialog).getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Product not found. Select a product from the list.")).toBeInTheDocument();
  });

  it("refunds an order and refreshes the list", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
    });
    mockWorkspace("WORKSPACE_ADMIN");
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
        orders: [
          {
            id: "order-12345678",
            createdAt: "2026-03-28T10:00:00.000Z",
            productId: "product-1",
            amount: 49,
            status: "refunded",
            product: { id: "product-1", name: "Starter" },
            _count: { events: 2 },
          },
        ],
        nextCursor: null,
      });
    mocks.updateAdminOrderStatus.mockResolvedValue(undefined);

    renderPage();

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Refund" })[0]!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mocks.updateAdminOrderStatus).toHaveBeenCalledWith("order-12345678", "refunded");
    });
    expect((await screen.findAllByText("refunded")).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows a status update error without refreshing the list", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
    });
    mockWorkspace("WORKSPACE_ADMIN");
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
    mocks.updateAdminOrderStatus.mockRejectedValue(new Error("Unable to update order status."));

    renderPage();

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm" }));

    expect(await screen.findByText("Unable to update order status.")).toBeInTheDocument();
    expect(mocks.listAdminOrders).toHaveBeenCalledTimes(1);
  });

  it("renders orders and shows mutating actions for workspace-managing roles", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", role: "WORKSPACE_ADMIN" },
    });
    mockWorkspace("WORKSPACE_ADMIN");
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
    mockWorkspace("WORKSPACE_VIEWER");
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
    mockWorkspace("WORKSPACE_ADMIN");
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
    mockWorkspace("WORKSPACE_ADMIN");
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
