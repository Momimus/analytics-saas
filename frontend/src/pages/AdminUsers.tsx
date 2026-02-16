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

type PendingAction = {
  kind: "suspend" | "activate" | "transfer";
  user: AdminUser;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        setFieldErrors(null);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
          setFieldErrors(err.fieldErrors ?? null);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load users");
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
        setFieldErrors(err.fieldErrors ?? null);
      } else {
        setError("Action failed");
      }
      setToast({ message: "Action failed.", tone: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="grid gap-6">
      <AdminSectionNav />

      <GlassCard title="Users" subtitle="Suspend, activate, and manage roles.">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search email or name"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="ALL">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="STUDENT">Student</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="ALL">All status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <Button type="button" className="h-10 px-4 py-0" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        {fieldErrors && (
          <div className="mb-3 rounded-[var(--radius-md)] border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {Object.entries(fieldErrors).map(([field, message]) => (
              <p key={field}>{field}: {message}</p>
            ))}
          </div>
        )}

        <AdminTable loading={loading} error={error} hasRows={users.length > 0} emptyMessage="No users found." colCount={4}>
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
                  <p className="font-medium">{user.fullName?.trim() || user.email}</p>
                  <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                </td>
                <td className="px-3 py-2">{user.role}</td>
                <td className="px-3 py-2">{user.suspendedAt ? "Suspended" : "Active"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {user.role !== "ADMIN" && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-10 px-3 py-0"
                          onClick={() => setPendingAction({ kind: user.suspendedAt ? "activate" : "suspend", user })}
                        >
                          {user.suspendedAt ? "Activate" : "Suspend"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-10 px-3 py-0"
                          onClick={async () => {
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
                          }}
                        >
                          Make {user.role === "STUDENT" ? "Instructor" : "Student"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-10 px-3 py-0"
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
