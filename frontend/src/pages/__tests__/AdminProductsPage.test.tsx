import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminProductsPage from "../AdminProducts";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useWorkspace: vi.fn(),
  listAdminProducts: vi.fn(),
  archiveAdminProduct: vi.fn(),
  createAdminProduct: vi.fn(),
}));

vi.mock("../../context/auth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../../context/workspace", () => ({
  useWorkspace: mocks.useWorkspace,
}));

vi.mock("../../api/adminAnalytics", () => ({
  listAdminProducts: mocks.listAdminProducts,
  archiveAdminProduct: mocks.archiveAdminProduct,
  createAdminProduct: mocks.createAdminProduct,
}));

afterEach(() => {
  vi.clearAllMocks();
});

function mockWorkspace(role: "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER") {
  mocks.useWorkspace.mockReturnValue({
    currentWorkspaceRole: role,
  });
}

describe("AdminProductsPage", () => {
  it("creates a product, closes the dialog, and refreshes the list", async () => {
    mocks.useAuth.mockReturnValue({ user: { id: "admin-1", role: "WORKSPACE_ADMIN" } });
    mockWorkspace("WORKSPACE_ADMIN");
    mocks.listAdminProducts
      .mockResolvedValueOnce({
        products: [{ id: "prod-1", name: "Starter", isActive: true, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 2, events: 4 } }],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        products: [
          { id: "prod-1", name: "Starter", isActive: true, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 2, events: 4 } },
          { id: "prod-2", name: "Growth", isActive: true, createdAt: "2026-03-02T00:00:00.000Z", _count: { orders: 0, events: 0 } },
        ],
        nextCursor: null,
      });
    mocks.createAdminProduct.mockResolvedValue({
      product: { id: "prod-2", name: "Growth", price: 99, isActive: true },
    });

    render(<AdminProductsPage />);

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Create product" }));

    fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "Growth" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "99" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mocks.createAdminProduct).toHaveBeenCalledWith({ name: "Growth", price: 99 });
    });
    expect((await screen.findAllByText("Growth")).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.listAdminProducts).toHaveBeenCalledTimes(2);
  });

  it("shows validation feedback for invalid create input", async () => {
    mocks.useAuth.mockReturnValue({ user: { id: "admin-1", role: "WORKSPACE_ADMIN" } });
    mockWorkspace("WORKSPACE_ADMIN");
    mocks.listAdminProducts.mockResolvedValue({ products: [], nextCursor: null });

    render(<AdminProductsPage />);

    expect(await screen.findByText("No products yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Product name is required.")).toBeInTheDocument();
    expect(mocks.createAdminProduct).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "Growth" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "0" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Price must be a number greater than or equal to 1.")).toBeInTheDocument();
    expect(mocks.createAdminProduct).not.toHaveBeenCalled();
  });

  it("archives a product and refreshes the list", async () => {
    mocks.useAuth.mockReturnValue({ user: { id: "admin-1", role: "WORKSPACE_ADMIN" } });
    mockWorkspace("WORKSPACE_ADMIN");
    mocks.listAdminProducts
      .mockResolvedValueOnce({
        products: [{ id: "prod-1", name: "Starter", isActive: true, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 2, events: 4 } }],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        products: [{ id: "prod-1", name: "Starter", isActive: false, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 2, events: 4 } }],
        nextCursor: null,
      });
    mocks.archiveAdminProduct.mockResolvedValue(undefined);

    render(<AdminProductsPage />);

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Archive" }));

    await waitFor(() => {
      expect(mocks.archiveAdminProduct).toHaveBeenCalledWith("prod-1");
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.listAdminProducts).toHaveBeenCalledTimes(2);
  });

  it("shows the mapped archive error when the product still has related data", async () => {
    mocks.useAuth.mockReturnValue({ user: { id: "admin-1", role: "WORKSPACE_ADMIN" } });
    mockWorkspace("WORKSPACE_ADMIN");
    mocks.listAdminProducts.mockResolvedValue({
      products: [{ id: "prod-1", name: "Starter", isActive: true, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 2, events: 4 } }],
      nextCursor: null,
    });
    mocks.archiveAdminProduct.mockRejectedValue(new Error("product_in_use"));

    render(<AdminProductsPage />);

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Archive" }));

    expect(await screen.findByText("Can't delete, product has orders/events. Archive instead.")).toBeInTheDocument();
    expect(mocks.listAdminProducts).toHaveBeenCalledTimes(1);
  });

  it("renders products, applies search after debounce, and shows management actions for admins", async () => {
    mocks.useAuth.mockReturnValue({ user: { id: "admin-1", role: "WORKSPACE_ADMIN" } });
    mockWorkspace("WORKSPACE_ADMIN");
    mocks.listAdminProducts
      .mockResolvedValueOnce({
        products: [{ id: "prod-1", name: "Starter", isActive: true, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 2, events: 4 } }],
        nextCursor: null,
      })
      .mockResolvedValueOnce({ products: [], nextCursor: null });

    render(<AdminProductsPage />);

    expect((await screen.findAllByText("Starter")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Create product" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Archive" }).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText("Search products"), { target: { value: "missing" } });
    await waitFor(() => {
      expect(mocks.listAdminProducts).toHaveBeenLastCalledWith({
        limit: 25,
        q: "missing",
        showArchived: false,
      });
    });
    expect(await screen.findByText("No products match your search.")).toBeInTheDocument();
  });

  it("hides mutating actions for viewer users and shows the general empty state", async () => {
    mocks.useAuth.mockReturnValue({ user: { id: "viewer-1", role: "WORKSPACE_VIEWER" } });
    mockWorkspace("WORKSPACE_VIEWER");
    mocks.listAdminProducts.mockResolvedValue({ products: [], nextCursor: null });

    render(<AdminProductsPage />);

    expect(await screen.findByText("No products yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.getByText("Read-only access")).toBeInTheDocument();
  });

  it("shows the error state and retries loading products", async () => {
    mocks.useAuth.mockReturnValue({ user: { id: "admin-1", role: "WORKSPACE_ADMIN" } });
    mockWorkspace("WORKSPACE_ADMIN");
    mocks.listAdminProducts
      .mockRejectedValueOnce(new Error("Products failed"))
      .mockResolvedValueOnce({
        products: [{ id: "prod-1", name: "Recovered", isActive: true, createdAt: "2026-03-01T00:00:00.000Z", _count: { orders: 1, events: 1 } }],
        nextCursor: null,
      });

    render(<AdminProductsPage />);

    expect(await screen.findByText("Products failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect((await screen.findAllByText("Recovered")).length).toBeGreaterThan(0);
    expect(mocks.listAdminProducts).toHaveBeenCalledTimes(2);
  });
});
