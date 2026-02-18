import { useCallback, useEffect, useState } from "react";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import type { AdminUser } from "../lib/admin";
import { listAdminUsers } from "../lib/admin";
import { apiFetch, ApiError } from "../lib/api";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import { AdminPagination, AdminTable } from "../components/admin/AdminTable";
import ConfirmActionModal from "../components/admin/ConfirmActionModal";
import ToastBanner from "../components/admin/ToastBanner";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import MobileActionMenu from "../components/admin/MobileActionMenu";
import Select from "../components/ui/Select";

type PendingAction = {
  kind: "suspend" | "activate" | "transfer";
  user: AdminUser;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "INSTRUCTOR" | "STUDENT">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "suspended">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const activeFilters = [
    ...(search.trim() ? [{ key: "search", label: "Search", value: search.trim(), onRemove: () => setSearch("") }] : []),
    ...(roleFilter !== "ALL" ? [{ key: "role", label: "Role", value: roleFilter, onRemove: () => setRoleFilter("ALL") }] : []),
    ...(statusFilter !== "ALL" ? [{ key: "status", label: "Status", value: statusFilter, onRemove: () => setStatusFilter("ALL") }] : []),
  ];

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search.trim()) params.set("search", search.trim());
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    const result = await listAdminUsers(params);
    setUsers(result.users);
    setTotal(result.total);
    setTotalPages(result.totalPages);
  }, [page, pageSize, roleFilter, search, statusFilter]);

  useEffect(() => {
    setLoading(true);
    load()
      .then(() => {
        setError(null);
        setErrorStatusCode(undefined);
        setErrorDetails(undefined);
        setFieldErrors(null);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
          setErrorStatusCode(err.status);
          setErrorDetails(err.code);
          setFieldErrors(err.fieldErrors ?? null);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load users");
          setErrorStatusCode(undefined);
          setErrorDetails(undefined);
          setFieldErrors(null);
        }
      })
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter, pageSize]);

  const runAction = async (reason: string) => {
    if (!pendingAction) return;

    setActionBusy(true);
    try {
      if (pendingAction.kind === "suspend") {
        await apiFetch<{ ok: true }>(`/admin/users/${pendingAction.user.id}/suspend`, {
          method: "PATCH",
          body: JSON.stringify({ reason }),
        });
      }

      if (pendingAction.kind === "activate") {
        await apiFetch<{ ok: true }>(`/admin/users/${pendingAction.user.id}/activate`, {
          method: "PATCH",
          body: JSON.stringify({ reason: reason || null }),
        });
      }

      if (pendingAction.kind === "transfer") {
        await apiFetch<{ ok: true }>(`/admin/users/${pendingAction.user.id}/transfer-admin`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        });
      }

      await load();
      setPendingAction(null);
      setToast({ message: "User action completed.", tone: "success" });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorStatusCode(err.status);
        setErrorDetails(err.code);
        setFieldErrors(err.fieldErrors ?? null);
      } else {
        setError("Action failed");
        setErrorStatusCode(undefined);
        setErrorDetails(undefined);
      }
      setToast({ message: "Action failed.", tone: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const handleRoleToggle = async (user: AdminUser) => {
    try {
      await apiFetch<{ user: AdminUser }>(`/admin/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: user.role === "STUDENT" ? "INSTRUCTOR" : "STUDENT" }),
      });
      await load();
      setToast({ message: "Role updated.", tone: "success" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update role";
      setError(message);
      setToast({ message, tone: "error" });
    }
  };

  return (
    <div className="grid gap-5">
      <AdminSectionNav />

      <GlassCard title="Users" subtitle="Suspend, activate, and manage roles.">
        <AdminFilterBar
          title="User Filters"
          helper="Search and narrow user moderation views."
          activeFilterCount={activeFilters.length}
          hint="Filter users by search text, role, or account status."
          onReset={() => {
            setSearch("");
            setRoleFilter("ALL");
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
            value={roleFilter}
            onChange={(next) => setRoleFilter(next as typeof roleFilter)}
            ariaLabel="Filter users by role"
            items={[
              { label: "All roles", value: "ALL" },
              { label: "Admin", value: "ADMIN" },
              { label: "Instructor", value: "INSTRUCTOR" },
              { label: "Student", value: "STUDENT" },
            ]}
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
        </AdminFilterBar>

        {fieldErrors && (
          <div className="mb-3 rounded-[var(--radius-md)] border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {Object.entries(fieldErrors).map(([field, message]) => (
              <p key={field}>{field}: {message}</p>
            ))}
          </div>
        )}

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
            setRoleFilter("ALL");
            setStatusFilter("ALL");
          }}
          hasRows={users.length > 0}
          emptyMessage="No results. Try broadening your filters or refresh to reload users."
          colCount={4}
          responsiveMode="stack"
          mobileStack={
            <div className="grid gap-2.5">
              {users.map((user) => (
                <article
                  key={user.id}
                  className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/40 p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text)]">{user.fullName?.trim() || user.email}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
                    </div>
                    {user.role !== "ADMIN" ? (
                      <MobileActionMenu
                        items={[
                          {
                            label: user.suspendedAt ? "Activate" : "Suspend",
                            onSelect: () => {
                              setPendingAction({ kind: user.suspendedAt ? "activate" : "suspend", user });
                            },
                          },
                          {
                            label: `Make ${user.role === "STUDENT" ? "Instructor" : "Student"}`,
                            onSelect: () => handleRoleToggle(user),
                          },
                          {
                            label: "Transfer Admin",
                            onSelect: () => {
                              setPendingAction({ kind: "transfer", user });
                            },
                          },
                        ]}
                      />
                    ) : null}
                  </div>
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
              <th className="px-3 py-2">Actions</th>
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
                <td className="px-3 py-2">
                  {user.role !== "ADMIN" ? (
                    <MobileActionMenu
                      items={[
                        {
                          label: user.suspendedAt ? "Activate" : "Suspend",
                          onSelect: () => {
                            setPendingAction({ kind: user.suspendedAt ? "activate" : "suspend", user });
                          },
                        },
                        {
                          label: `Make ${user.role === "STUDENT" ? "Instructor" : "Student"}`,
                          onSelect: () => handleRoleToggle(user),
                        },
                        {
                          label: "Transfer Admin",
                          onSelect: () => {
                            setPendingAction({ kind: "transfer", user });
                          },
                        },
                      ]}
                    />
                  ) : null}
                  <div className="hidden flex-wrap gap-2 sm:flex">
                    {user.role !== "ADMIN" && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-2.5 py-0 text-xs"
                          onClick={() => setPendingAction({ kind: user.suspendedAt ? "activate" : "suspend", user })}
                        >
                          {user.suspendedAt ? "Activate" : "Suspend"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-2.5 py-0 text-xs"
                          onClick={() => {
                            void handleRoleToggle(user);
                          }}
                        >
                          Make {user.role === "STUDENT" ? "Instructor" : "Student"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-2.5 py-0 text-xs"
                          onClick={() => setPendingAction({ kind: "transfer", user })}
                        >
                          Transfer Admin
                        </Button>
                      </>
                    )}
                  </div>
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
          onPageSizeChange={setPageSize}
        />
      </GlassCard>

      <ConfirmActionModal
        open={Boolean(pendingAction)}
        title={pendingAction?.kind === "transfer" ? "Transfer admin role" : pendingAction?.kind === "activate" ? "Activate user" : "Suspend user"}
        description={
          pendingAction?.kind === "transfer"
            ? "This will transfer the single admin role to the selected user."
            : pendingAction?.kind === "activate"
              ? "This will restore account access for the selected user."
              : "This will block access for the selected user."
        }
        confirmLabel={pendingAction?.kind === "transfer" ? "Transfer" : pendingAction?.kind === "activate" ? "Activate" : "Suspend"}
        requireReason={pendingAction?.kind !== "activate"}
        reasonLabel="Reason"
        reasonPlaceholder="Required for moderation actions"
        busy={actionBusy}
        onClose={() => setPendingAction(null)}
        onConfirm={runAction}
      />

      {toast && <ToastBanner message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}

