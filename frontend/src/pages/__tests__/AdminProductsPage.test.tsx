import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminProductsPage from "../AdminProducts";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  listAdminProducts: vi.fn(),
  archiveAdminProduct: vi.fn(),
  createAdminProduct: vi.fn(),
}));

vi.mock("../../context/auth", () => ({
  useAuth: mocks.useAuth,
  canManageWorkspace: (user: { role?: string } | null) => user?.role === "SUPER_ADMIN" || user?.role === "WORKSPACE_ADMIN",
}));

vi.mock("../../api/adminAnalytics", () => ({
  listAdminProducts: mocks.listAdminProducts,
  archiveAdminProduct: mocks.archiveAdminProduct,
  createAdminProduct: mocks.createAdminProduct,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminProductsPage", () => {
  it("renders products, applies search after debounce, and shows management actions for admins", async () => {
    mocks.useAuth.mockReturnValue({ user: { id: "admin-1", role: "WORKSPACE_ADMIN" } });
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
    mocks.listAdminProducts.mockResolvedValue({ products: [], nextCursor: null });

    render(<AdminProductsPage />);

    expect(await screen.findByText("No products yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.getByText("Read-only access")).toBeInTheDocument();
  });

  it("shows the error state and retries loading products", async () => {
    mocks.useAuth.mockReturnValue({ user: { id: "admin-1", role: "WORKSPACE_ADMIN" } });
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
