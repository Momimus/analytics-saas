import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveAdminProduct,
  createAdminProduct,
  listAdminProducts,
  type AdminProductListItem,
} from "../api/adminAnalytics";
import {
  AdminTable,
  adminTableCellClass,
  adminTableHeadCellClass,
  adminTableHeadRowClass,
  adminTableRowClass,
} from "../components/admin/AdminTable";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import Button from "../components/Button";
import Input from "../components/Input";
import Dialog from "../components/ui/Dialog";
import GlassCard from "../components/ui/GlassCard";
import type { ApiError } from "../lib/api";

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
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function shortId(value: string) {
  return value.slice(-8);
}

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [showArchived, setShowArchived] = useState(false);

  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState("1");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminProductListItem | null>(null);
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setErrorStatusCode(undefined);
    setErrorDetails(undefined);
    setProducts([]);
    setNextCursor(null);

    listAdminProducts({
      limit: PAGE_SIZE,
      q: debouncedSearch || undefined,
      showArchived,
    })
      .then((result) => {
        if (!active) return;
        setProducts(result.products);
        setNextCursor(result.nextCursor);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const apiErr = err as ApiError;
        setError(err instanceof Error ? err.message : "Failed to load products");
        setErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
        setErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, refreshKey, showArchived]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await listAdminProducts({
        limit: PAGE_SIZE,
        q: debouncedSearch || undefined,
        cursor: nextCursor,
        showArchived,
      });
      setProducts((prev) => {
        const merged = [...prev, ...result.products];
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
      setError(err instanceof Error ? err.message : "Failed to load more products");
      setErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
      setErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
    } finally {
      setLoadingMore(false);
    }
  }

  const rows = useMemo(() => {
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      isActive: product.isActive ?? true,
      shortId: shortId(product.id),
      created: formatDateTime(product.createdAt),
      orders: product._count?.orders ?? 0,
      events: product._count?.events ?? 0,
    }));
  }, [products]);

  async function submitCreateProduct() {
    const name = createName.trim();
    const price = Number(createPrice);
    if (!name) {
      setCreateError("Product name is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 1) {
      setCreateError("Price must be a number greater than or equal to 1.");
      return;
    }

    setCreateSaving(true);
    setCreateError(null);
    try {
      await createAdminProduct({ name, price });
      setIsCreateOpen(false);
      setCreateName("");
      setCreatePrice("1");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setCreateSaving(false);
    }
  }

  async function confirmArchiveProduct() {
    if (!archiveTarget) return;
    setArchiveSaving(true);
    setArchiveError(null);
    try {
      await archiveAdminProduct(archiveTarget.id);
      setArchiveTarget(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to archive product.";
      if (message.toLowerCase().includes("product_in_use")) {
        setArchiveError("Can't delete, product has orders/events. Archive instead.");
      } else {
        setArchiveError(message);
      }
    } finally {
      setArchiveSaving(false);
    }
  }

  async function copyProductId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedProductId(id);
      window.setTimeout(() => {
        setCopiedProductId((current) => (current === id ? null : current));
      }, 1200);
    } catch {
      // no-op: clipboard access can fail in restricted contexts
    }
  }

  const handleCloseCreateDialog = useCallback(() => {
    if (createSaving) return;
    setIsCreateOpen(false);
  }, [createSaving]);

  const handleCloseArchiveDialog = useCallback(() => {
    if (archiveSaving) return;
    setArchiveTarget(null);
  }, [archiveSaving]);

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Products"
          subtitle="Browse product catalog records and related activity."
          compact
          aside={
            <div className="flex items-center gap-2.5">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--ui-text-muted)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products"
                  className="h-10 w-64 rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-9 text-sm text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] outline-none transition focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent-soft)]"
                />
              </label>
              <label className="inline-flex h-10 items-center gap-2 rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3 text-sm text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)]">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(event) => {
                    setShowArchived(event.target.checked);
                  }}
                  className="h-4 w-4 rounded border-[color:var(--ui-border-soft)] text-[var(--ui-accent)] focus:ring-[var(--ui-accent-soft)]"
                />
                <span>Show archived</span>
              </label>
              <Button
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setCreatePrice("1");
                  setIsCreateOpen(true);
                }}
              >
                Create product
              </Button>
            </div>
          }
        />

        <AdminTable
          loading={loading}
          error={error}
          errorStatusCode={errorStatusCode}
          errorDetails={errorDetails}
          onRetry={() => setRefreshKey((prev) => prev + 1)}
          hasRows={rows.length > 0}
            emptyMessage={debouncedSearch ? "No products match your search." : "No products yet."}
            colCount={6}
            stickyHeader
            zebraRows
            density="comfortable"
        >
          <thead>
            <tr className={adminTableHeadRowClass}>
              <th className={adminTableHeadCellClass}>Name</th>
              <th className={adminTableHeadCellClass}>Product ID (Short)</th>
              <th className={adminTableHeadCellClass}>Created</th>
              <th className={adminTableHeadCellClass}>Orders</th>
              <th className={adminTableHeadCellClass}>Events</th>
              <th className={adminTableHeadCellClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={adminTableRowClass}>
                <td className={`${adminTableCellClass} min-w-[220px] truncate font-medium`} title={row.name}>
                  <div className="inline-flex items-center gap-2">
                    <span className="truncate">{row.name}</span>
                    {!row.isActive ? (
                      <span className="rounded border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ui-text-muted)]">
                        Archived
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className={`${adminTableCellClass} w-[180px] text-[var(--ui-text-muted)]`} title={row.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{row.shortId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        void copyProductId(row.id);
                      }}
                      className="rounded border border-[color:var(--ui-border-soft)] px-1.5 py-0.5 text-[10px] text-[var(--ui-text-muted)] transition hover:bg-[color:var(--surface-alt)]"
                      aria-label="Copy full product id"
                    >
                      {copiedProductId === row.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                </td>
                <td className={`${adminTableCellClass} w-[160px] text-[var(--ui-text-secondary)]`}>{row.created}</td>
                <td className={`${adminTableCellClass} w-[80px] tabular-nums`}>{row.orders}</td>
                <td className={`${adminTableCellClass} w-[80px] tabular-nums`}>{row.events}</td>
                <td className={`${adminTableCellClass} w-[90px]`}>
                  <button
                    type="button"
                    onClick={() => {
                      const target = products.find((product) => product.id === row.id) ?? null;
                      setArchiveError(null);
                      setArchiveTarget(target);
                    }}
                    className="rounded border border-[color:var(--ui-border-soft)] px-2 py-1 text-xs text-[var(--danger)] transition hover:bg-[color:var(--surface-alt)]"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>

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

      <Dialog
        open={isCreateOpen}
        onClose={handleCloseCreateDialog}
        className="max-w-md"
      >
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ui-text-primary)]">Create product</h2>
          <Input
            label="Product name"
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Starter Plan"
            autoComplete="off"
          />
          <Input
            label="Price"
            type="number"
            min={1}
            step="0.01"
            value={createPrice}
            onChange={(event) => setCreatePrice(event.target.value)}
            placeholder="1.00"
          />
          {createError ? <p className="text-sm text-[var(--danger)]">{createError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              disabled={createSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitCreateProduct()} disabled={createSaving}>
              {createSaving ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(archiveTarget)}
        onClose={handleCloseArchiveDialog}
        className="max-w-md"
      >
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ui-text-primary)]">Archive product?</h2>
          <p className="text-sm text-[var(--ui-text-muted)]">
            This will hide the product from active use without removing related analytics history.
          </p>
          {archiveError ? <p className="text-sm text-[var(--danger)]">{archiveError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setArchiveTarget(null)}
              disabled={archiveSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void confirmArchiveProduct()} disabled={archiveSaving}>
              {archiveSaving ? "Archiving..." : "Archive"}
            </Button>
          </div>
        </div>
      </Dialog>
    </AdminPage>
  );
}
