import { useEffect, useState } from "react";
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
import Input from "../components/Input";
import { listAdminUsers, type AdminUserListItem } from "../lib/admin";
import type { ApiError } from "../lib/api";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Users"
          subtitle="Super admin user directory."
          compact
          aside={
            <div className="flex items-end gap-2.5">
              <Input
                label="Search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search email or name"
                className="w-64"
              />
              <label className="grid gap-1.5 text-sm font-medium text-[var(--ui-text-muted)]">
                <span className="text-[var(--ui-text-primary)]">Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setPage(1);
                    setStatus(event.target.value as "all" | "active" | "suspended");
                  }}
                  className="h-10 rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3 text-sm text-[var(--ui-text-primary)]"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
            </div>
          }
        />

        <AdminTable
          loading={loading}
          error={error}
          errorStatusCode={errorStatusCode}
          errorDetails={errorDetails}
          onRetry={() => setRefreshKey((current) => current + 1)}
          hasRows={users.length > 0}
          emptyMessage="No users found."
          colCount={5}
          stickyHeader
          zebraRows
          density="comfortable"
        >
          <thead>
            <tr className={adminTableHeadRowClass}>
              <th className={adminTableHeadCellClass}>User</th>
              <th className={adminTableHeadCellClass}>Role</th>
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
                  {user.fullName ? <div className="text-xs text-[var(--ui-text-muted)]">{user.email}</div> : null}
                </td>
                <td className={adminTableCellClass}>{user.role}</td>
                <td className={adminTableCellClass}>
                  <Badge tone={user.suspendedAt ? "warning" : "success"}>
                    {user.suspendedAt ? "Suspended" : "Active"}
                  </Badge>
                </td>
                <td className={adminTableCellClass}>{formatDate(user.createdAt)}</td>
                <td className={`${adminTableCellClass} font-mono text-xs text-[var(--ui-text-muted)]`} title={user.id}>
                  {user.id.slice(-8)}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>

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
      </GlassCard>
    </AdminPage>
  );
}
