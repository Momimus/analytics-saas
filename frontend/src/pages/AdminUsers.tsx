import { useEffect, useMemo, useState } from "react";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import {
  AdminPagination,
  AdminTable,
  adminTableCellClass,
  adminTableHeadCellClass,
  adminTableHeadRowClass,
  adminTableRowClass,
} from "../components/admin/AdminTable";
import GlassCard from "../components/ui/GlassCard";
import Badge from "../components/ui/Badge";
import { listAdminUsers, type AdminUserListItem } from "../lib/admin";
import type { ApiError } from "../lib/api";
import { platformRoleLabel } from "../lib/roles";

function formatDate(value: string) {
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setErrorStatusCode(undefined);
    setErrorDetails(undefined);

    listAdminUsers({ page, pageSize, search, status })
      .then((result) => {
        if (!active) return;
        setUsers(result.users);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const apiErr = err as ApiError;
        setError(err instanceof Error ? err.message : "Failed to load users");
        setErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
        setErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, pageSize, refreshKey, search, status]);

  const activeFilterCount = (search.trim() ? 1 : 0) + (status !== "all" ? 1 : 0);
  const suspendedCount = useMemo(() => users.filter((user) => Boolean(user.suspendedAt)).length, [users]);

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader title="Users" subtitle="Super admin user directory." compact />

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Visible Users</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{users.length}</p>
          </div>
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-accent-soft)]/35 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Suspended</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{suspendedCount}</p>
          </div>
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Page</p>
            <p className="mt-1 text-sm font-medium text-[var(--ui-text-primary)]">{page} of {totalPages || 1}</p>
          </div>
        </div>

        <div className="mt-4">
          <AdminFilterBar
            title="User Filters"
            helper="Find users by name or email and narrow the directory by platform role or account status."
            activeFilterCount={activeFilterCount}
            onReset={activeFilterCount > 0 ? () => {
              setPage(1);
              setSearch("");
              setStatus("all");
            } : undefined}
          >
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ui-text-primary)]">Search</span>
              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search email or name"
                className="h-10 w-full rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3 text-sm text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] outline-none transition focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent-soft)]"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ui-text-primary)]">Status</span>
              <select
                value={status}
                onChange={(event) => {
                  setPage(1);
                  setStatus(event.target.value as "all" | "active" | "suspended");
                }}
                className="h-10 w-full rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3 text-sm text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] outline-none transition focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent-soft)]"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
          </AdminFilterBar>
        </div>

        <div className="mt-4">
          <AdminTable
            loading={loading}
            error={error}
            errorStatusCode={errorStatusCode}
            errorDetails={errorDetails}
            onRetry={() => setRefreshKey((current) => current + 1)}
            hasRows={users.length > 0}
            emptyMessage={activeFilterCount > 0 ? "No users match the current filters." : "No users found."}
            colCount={5}
            stickyHeader
            zebraRows
            density="comfortable"
            responsiveMode="stack"
            mobileStack={
              <div className="grid gap-3">
                {users.map((user) => (
                  <article key={user.id} className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-4 shadow-[var(--ui-shadow-sm)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--ui-text-primary)]">{user.fullName?.trim() || user.email}</p>
                        <p className="mt-1 truncate text-sm text-[var(--ui-text-secondary)]">{user.email}</p>
                      </div>
                      <Badge tone={user.suspendedAt ? "warning" : "success"}>
                        {user.suspendedAt ? "Suspended" : "Active"}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Platform Role</p>
                        <p className="mt-1 text-[var(--ui-text-primary)]">{platformRoleLabel(user.role)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Created</p>
                        <p className="mt-1 text-[var(--ui-text-primary)]">{formatDate(user.createdAt)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">User ID</p>
                        <p className="mt-1 font-mono text-xs text-[var(--ui-text-muted)] break-all">{user.id}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            }
          >
            <thead>
              <tr className={adminTableHeadRowClass}>
                <th className={adminTableHeadCellClass}>User</th>
                <th className={adminTableHeadCellClass}>Platform Role</th>
                <th className={adminTableHeadCellClass}>Status</th>
                <th className={adminTableHeadCellClass}>Created</th>
                <th className={adminTableHeadCellClass}>User ID</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={adminTableRowClass}>
                  <td className={`${adminTableCellClass} min-w-[240px]`}>
                    <div className="font-medium">{user.fullName?.trim() || user.email}</div>
                    <div className="text-xs text-[var(--ui-text-muted)]">{user.email}</div>
                  </td>
                  <td className={adminTableCellClass}>{platformRoleLabel(user.role)}</td>
                  <td className={adminTableCellClass}>
                    <Badge tone={user.suspendedAt ? "warning" : "success"}>
                      {user.suspendedAt ? "Suspended" : "Active"}
                    </Badge>
                  </td>
                  <td className={adminTableCellClass}>{formatDate(user.createdAt)}</td>
                  <td className={`${adminTableCellClass} font-mono text-xs text-[var(--ui-text-muted)]`} title={user.id}>
                    {shortId(user.id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </div>

        <div className="mt-4">
          <AdminPagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPage(1);
              setPageSize(size);
            }}
          />
        </div>
      </GlassCard>
    </AdminPage>
  );
}
