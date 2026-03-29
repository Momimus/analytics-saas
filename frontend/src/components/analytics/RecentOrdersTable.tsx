import {
  AdminTable,
  adminTableCellClass,
  adminTableHeadCellClass,
  adminTableHeadRowClass,
  adminTableRowClass,
} from "../admin/AdminTable";
import Badge from "../ui/Badge";

type RecentOrderRow = {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
  productName: string;
};

type RecentOrdersTableProps = {
  rows: RecentOrderRow[];
  loading?: boolean;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function toneForStatus(status: string): "success" | "warning" | "warn" | "neutral" {
  const normalized = status.trim().toLowerCase();
  if (normalized === "completed") return "success";
  if (normalized === "pending") return "warning";
  if (normalized === "refunded" || normalized === "canceled") return "warn";
  return "neutral";
}

export default function RecentOrdersTable({ rows, loading = false }: RecentOrdersTableProps) {
  return (
    <>
      <div className="md:hidden">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-4">
                <div className="h-4 w-24 animate-pulse rounded bg-[color:var(--surface-strong)]/60" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-[color:var(--surface-strong)]/50" />
                <div className="mt-3 h-8 w-20 animate-pulse rounded bg-[color:var(--surface-strong)]/70" />
              </div>
            ))}
          </div>
        ) : rows.length > 0 ? (
          <div className="grid gap-3">
            {rows.map((row) => (
              <article key={row.id} className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-4 shadow-[var(--ui-shadow-sm)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--ui-text-primary)]">#{row.id.slice(-8)}</p>
                    <p className="mt-1 truncate text-sm text-[var(--ui-text-secondary)]" title={row.productName}>
                      {row.productName}
                    </p>
                  </div>
                  <Badge tone={toneForStatus(row.status)}>{row.status}</Badge>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Amount</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-text-primary)]">{formatCurrency(row.amount)}</p>
                  </div>
                  <p className="text-right text-xs text-[var(--ui-text-muted)]">
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(row.createdAt))}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--ui-radius-md)] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-6 text-sm text-[var(--ui-text-muted)]">
            No recent orders for this workspace yet.
          </p>
        )}
      </div>

      <div className="hidden md:block">
        <AdminTable
          loading={loading}
          hasRows={rows.length > 0}
          emptyMessage="No recent orders for this workspace yet."
          colCount={4}
          density="comfortable"
          stickyHeader
          zebraRows
        >
          <thead>
            <tr className={adminTableHeadRowClass}>
              <th className={adminTableHeadCellClass}>Order</th>
              <th className={adminTableHeadCellClass}>Product</th>
              <th className={adminTableHeadCellClass}>Amount</th>
              <th className={adminTableHeadCellClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={adminTableRowClass}>
                <td className={adminTableCellClass}>
                  <div className="grid gap-1">
                    <span className="font-medium text-[var(--ui-text-primary)]">{row.id.slice(-8)}</span>
                    <span className="text-xs text-[var(--ui-text-muted)]">
                      {new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(row.createdAt))}
                    </span>
                  </div>
                </td>
                <td className={`${adminTableCellClass} max-w-[220px] truncate`} title={row.productName}>
                  {row.productName}
                </td>
                <td className={`${adminTableCellClass} font-medium text-[var(--ui-text-primary)]`}>
                  {formatCurrency(row.amount)}
                </td>
                <td className={adminTableCellClass}>
                  <Badge tone={toneForStatus(row.status)}>{row.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </div>
    </>
  );
}
