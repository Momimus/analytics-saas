import { useCallback, useEffect, useState } from "react";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import type { AdminUser } from "../lib/admin";
import { listAdminUsers } from "../lib/admin";
import { ApiError } from "../lib/api";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import { AdminPagination, AdminTable } from "../components/admin/AdminTable";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import Select from "../components/ui/Select";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "suspended">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const activeFilters = [
    ...(search.trim() ? [{ key: "search", label: "Search", value: search.trim(), onRemove: () => setSearch("") }] : []),
    ...(statusFilter !== "ALL" ? [{ key: "status", label: "Status", value: statusFilter, onRemove: () => setStatusFilter("ALL") }] : []),
  ];

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    const result = await listAdminUsers(params);
    setUsers(result.users);
    setTotal(result.total);
    setTotalPages(result.totalPages);
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    setLoading(true);
    load()
      .then(() => {
        setError(null);
        setErrorStatusCode(undefined);
        setErrorDetails(undefined);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
          setErrorStatusCode(err.status);
          setErrorDetails(err.code);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load users");
          setErrorStatusCode(undefined);
          setErrorDetails(undefined);
        }
      })
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  return (
    <div className="grid gap-5">
      <AdminSectionNav />

      <GlassCard title="Users" subtitle="Admin-only account list for this baseline.">
        <AdminFilterBar
          title="User Filters"
          helper="Search and filter current admin accounts."
          activeFilterCount={activeFilters.length}
          hint="This baseline only allows admin users."
          onReset={() => {
            setSearch("");
            setStatusFilter("ALL");
          }}
          rightSlot={
            <Button type="button" className="h-9 px-3 py-0 text-xs" onClick={() => void load()}>
              Refresh
            </Button>
          }
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search email or name"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <Select
            value={statusFilter}
            onChange={(next) => setStatusFilter(next as typeof statusFilter)}
            ariaLabel="Filter users by status"
            items={[
              { label: "All status", value: "ALL" },
              { label: "Active", value: "active" },
              { label: "Suspended", value: "suspended" },
            ]}
          />
          <div />
          <div />
        </AdminFilterBar>

        <AdminTable
          loading={loading}
          error={error}
          errorStatusCode={errorStatusCode}
          errorDetails={errorDetails}
          onRetry={() => void load()}
          stickyHeader
          zebraRows
          appliedFilters={activeFilters}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("ALL");
          }}
          hasRows={users.length > 0}
          emptyMessage="No users found for current filters."
          colCount={4}
          responsiveMode="stack"
          mobileStack={
            <div className="grid gap-2.5">
              {users.map((user) => (
                <article
                  key={user.id}
                  className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/40 p-2.5"
                >
                  <p className="truncate text-sm font-medium text-[var(--text)]">{user.fullName?.trim() || user.email}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-[var(--text-muted)]">
                    <p>Role: <span className="text-[var(--text)]">{user.role}</span></p>
                    <p>Status: <span className="text-[var(--text)]">{user.suspendedAt ? "Suspended" : "Active"}</span></p>
                  </div>
                </article>
              ))}
            </div>
          }
          emptyAction={
            <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" onClick={() => void load()}>
              Reload Users
            </Button>
          }
        >
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2">
                  <p className="truncate font-medium">{user.fullName?.trim() || user.email}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
                </td>
                <td className="px-3 py-2">{user.role}</td>
                <td className="px-3 py-2">{user.suspendedAt ? "Suspended" : "Active"}</td>
                <td className="px-3 py-2">{new Date(user.createdAt).toLocaleString()}</td>
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
          onPageSizeChange={setPageSize}
        />
      </GlassCard>
    </div>
  );
}
