import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listAdminOrders,
  listAdminProducts,
  updateAdminOrderStatus,
  type AdminOrderListItem,
  type AdminProductListItem,
} from "../api/adminAnalytics";
import {
  AdminTable,
  adminTableCellClass,
  adminTableHeadCellClass,
  adminTableHeadRowClass,
  adminTableRowClass,
} from "../components/admin/AdminTable";
import Button from "../components/Button";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import Dialog from "../components/ui/Dialog";
import Badge from "../components/ui/Badge";
import Combobox, { type ComboboxOption } from "../components/ui/Combobox";
import GlassCard from "../components/ui/GlassCard";
import Input from "../components/Input";
import { apiFetch } from "../lib/api";
import { track } from "../lib/track";
import type { ApiError } from "../lib/api";

type CreateOrderResponse = {
  order: {
    id: string;
    productId: string;
    amount: number;
    status: string;
    createdAt: string;
  };
};

const PAGE_SIZE = 25;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function shortId(value: string) {
  return value.slice(-8);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "success";
  if (normalized === "refunded" || normalized === "pending") return "warning";
  return "neutral";
}

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listErrorStatusCode, setListErrorStatusCode] = useState<number | undefined>(undefined);
  const [listErrorDetails, setListErrorDetails] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<AdminProductListItem[]>([]);
  const [productFieldError, setProductFieldError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("completed");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminOrderListItem | null>(null);
  const [statusAction, setStatusAction] = useState<"refunded" | "canceled">("refunded");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const debouncedProductQuery = useDebouncedValue(productQuery, 300);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError(null);
    setListErrorStatusCode(undefined);
    setListErrorDetails(undefined);
    setOrders([]);
    setNextCursor(null);

    listAdminOrders({ limit: PAGE_SIZE, q: debouncedSearch || undefined })
      .then((result) => {
        if (!active) return;
        setOrders(result.orders);
        setNextCursor(result.nextCursor);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const apiErr = err as ApiError;
        setListError(err instanceof Error ? err.message : "Failed to load orders");
        setListErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
        setListErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, refreshKey]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await listAdminOrders({
        limit: PAGE_SIZE,
        q: debouncedSearch || undefined,
        cursor: nextCursor,
      });
      setOrders((prev) => {
        const merged = [...prev, ...result.orders];
        const seen = new Set<string>();
        return merged.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      });
      setNextCursor(result.nextCursor);
    } catch (err) {
      const apiErr = err as ApiError;
      setListError(err instanceof Error ? err.message : "Failed to load more orders");
      setListErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
      setListErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!isCreateOpen) return;
    let active = true;
    setProductsLoading(true);
    setProductsError(null);

    listAdminProducts({ limit: 50, q: debouncedProductQuery || undefined })
      .then((result) => {
        if (!active) return;
        setProductOptions(result.products);
      })
      .catch((err) => {
        if (!active) return;
        setProductsError(err instanceof Error ? err.message : "Unable to load products");
        setProductOptions([]);
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isCreateOpen, debouncedProductQuery]);

  const handleCloseCreateOrder = useCallback(() => {
    if (saving) return;
    setIsCreateOpen(false);
  }, [saving]);

  async function submitCreateOrder() {
    setError(null);
    setSuccess(null);
    setProductFieldError(null);
    if (!selectedProductId.trim()) {
      setProductFieldError("Select a product from the list.");
      return;
    }
    if (!amount.trim() || Number(amount) <= 0) {
      setError("Order total must be a positive number.");
      return;
    }

    setSaving(true);
    try {
      const result = await apiFetch<CreateOrderResponse>("/admin/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: selectedProductId.trim(),
          amount: Number(amount),
          status,
        }),
      });
      await track("order_created", {
        orderId: result.order.id,
        productId: result.order.productId,
      });
      setSuccess(`Created order ${result.order.id.slice(0, 8)}.`);
      setIsCreateOpen(false);
      setSelectedProductId("");
      setProductQuery("");
      setAmount("");
      setStatus("completed");
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const message = err instanceof Error ? err.message : "Unable to create order.";
      const isProductNotFound = apiErr?.code === "product_not_found";
      if (isProductNotFound) {
        setProductFieldError("Product not found. Select a product from the list.");
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmOrderStatusUpdate() {
    if (!statusTarget) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      await updateAdminOrderStatus(statusTarget.id, statusAction);
      setStatusTarget(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Unable to update order status.");
    } finally {
      setStatusSaving(false);
    }
  }

  const rows = useMemo(() => {
    return orders.map((order) => ({
      id: order.id,
      shortId: shortId(order.id),
      productLabel: order.product?.name?.trim() || `Product #${shortId(order.productId)}`,
      productTitle: order.product?.name?.trim() || order.productId,
      created: formatDateTime(order.createdAt),
      amount: formatCurrency(order.amount),
      status: order.status,
      events: order._count?.events ?? 0,
    }));
  }, [orders]);

  const productComboboxOptions = useMemo<ComboboxOption[]>(
    () =>
      productOptions.map((product) => ({
        value: product.id,
        label: product.name,
        subLabel: shortId(product.id),
      })),
    [productOptions]
  );

  const statusOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "completed", label: "completed" },
      { value: "pending", label: "pending" },
      { value: "refunded", label: "refunded" },
    ],
    []
  );

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Orders"
          subtitle="Browse transaction records with product and status context."
          aside={
            <div className="flex items-center gap-2.5">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--ui-text-muted)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search orders"
                  className="h-10 w-64 rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-9 text-sm text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] outline-none transition focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent-soft)]"
                />
              </label>
              <Button
                type="button"
                onClick={() => {
                  setError(null);
                  setProductFieldError(null);
                  setSelectedProductId("");
                  setProductQuery("");
                  setAmount("");
                  setStatus("completed");
                  setIsCreateOpen(true);
                }}
              >
                Create order
              </Button>
            </div>
          }
          compact
        />
        {success ? <p className="mt-3 text-sm text-[var(--success)]">{success}</p> : null}
        {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}

        <div className="mt-4">
          <AdminTable
            loading={loading}
            error={listError}
            errorStatusCode={listErrorStatusCode}
            errorDetails={listErrorDetails}
            onRetry={() => setRefreshKey((prev) => prev + 1)}
            hasRows={rows.length > 0}
            emptyMessage={debouncedSearch ? "No orders match your search." : "No orders yet."}
            colCount={7}
            stickyHeader
            zebraRows
            density="comfortable"
          >
            <thead>
              <tr className={adminTableHeadRowClass}>
                <th className={adminTableHeadCellClass}>Order ID</th>
                <th className={adminTableHeadCellClass}>Product</th>
                <th className={adminTableHeadCellClass}>Created</th>
                <th className={adminTableHeadCellClass}>Amount</th>
                <th className={adminTableHeadCellClass}>Status</th>
                <th className={adminTableHeadCellClass}>Events</th>
                <th className={adminTableHeadCellClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={adminTableRowClass}>
                  <td className={`${adminTableCellClass} w-[140px] font-mono text-xs text-[var(--ui-text-muted)]`} title={row.id}>
                    {row.shortId}
                  </td>
                  <td className={`${adminTableCellClass} min-w-[220px] truncate font-medium`} title={row.productTitle}>
                    {row.productLabel}
                  </td>
                  <td className={`${adminTableCellClass} w-[160px] text-[var(--ui-text-secondary)]`}>{row.created}</td>
                  <td className={`${adminTableCellClass} w-[120px] tabular-nums`}>{row.amount}</td>
                  <td className={`${adminTableCellClass} w-[120px]`}>
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                  <td className={`${adminTableCellClass} w-[80px] tabular-nums`}>{row.events}</td>
                  <td className={`${adminTableCellClass} w-[160px]`}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={row.status.toLowerCase() === "refunded"}
                        onClick={() => {
                          const target = orders.find((order) => order.id === row.id) ?? null;
                          setStatusError(null);
                          setStatusAction("refunded");
                          setStatusTarget(target);
                        }}
                        className="rounded border border-[color:var(--ui-border-soft)] px-2 py-1 text-xs text-[var(--warning)] transition hover:bg-[color:var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Refund
                      </button>
                      <button
                        type="button"
                        disabled={row.status.toLowerCase() === "canceled"}
                        onClick={() => {
                          const target = orders.find((order) => order.id === row.id) ?? null;
                          setStatusError(null);
                          setStatusAction("canceled");
                          setStatusTarget(target);
                        }}
                        className="rounded border border-[color:var(--ui-border-soft)] px-2 py-1 text-xs text-[var(--danger)] transition hover:bg-[color:var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </div>

        {nextCursor ? (
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-4 py-0 text-sm"
              onClick={() => {
                void loadMore();
              }}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        ) : null}
      </GlassCard>

      <Dialog open={isCreateOpen} onClose={handleCloseCreateOrder} className="max-w-md">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ui-text-primary)]">Create order</h2>
          <label className="grid gap-1.5 text-sm font-medium text-[var(--ui-text-muted)]">
            <span className="text-[var(--ui-text-primary)]">Product</span>
            <Combobox
              value={selectedProductId}
              onChange={(nextValue) => {
                setSelectedProductId(nextValue);
                setProductFieldError(null);
              }}
              options={productComboboxOptions}
              placeholder="Select a product"
              searchable
              searchValue={productQuery}
              onSearchValueChange={setProductQuery}
              searchPlaceholder="Search products"
              loading={productsLoading}
              loadingMessage="Loading products..."
              emptyMessage="No products found"
              error={productsError}
              optionTitle={(option) => option.value}
              ariaLabel="Select a product"
            />
            {selectedProductId ? (
              <p className="text-xs text-[var(--ui-text-muted)]" title={selectedProductId}>
                Full Product ID: {selectedProductId}
              </p>
            ) : null}
            {productFieldError ? <p className="text-xs text-[var(--danger)]">{productFieldError}</p> : null}
          </label>
          <Input
            label="Order total"
            type="number"
            min={0.01}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="29.00"
          />
          <p className="text-xs text-[var(--ui-text-muted)]">
            This is the monetary total used in revenue analytics.
          </p>
          <label className="grid gap-1.5 text-sm font-medium text-[var(--ui-text-muted)]">
            <span className="text-[var(--ui-text-primary)]">Status</span>
            <Combobox
              value={status}
              onChange={setStatus}
              options={statusOptions}
              placeholder="Select status"
              ariaLabel="Select order status"
            />
          </label>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleCloseCreateOrder} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitCreateOrder()} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(statusTarget)}
        onClose={() => {
          if (statusSaving) return;
          setStatusTarget(null);
        }}
        className="max-w-md"
      >
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ui-text-primary)]">
            {statusAction === "refunded" ? "Refund order?" : "Cancel order?"}
          </h2>
          <p className="text-sm text-[var(--ui-text-muted)]">
            This updates the order status to <span className="font-medium">{statusAction}</span>.
          </p>
          {statusError ? <p className="text-sm text-[var(--danger)]">{statusError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStatusTarget(null)}
              disabled={statusSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void confirmOrderStatusUpdate()} disabled={statusSaving}>
              {statusSaving ? "Updating..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Dialog>
    </AdminPage>
  );
}



