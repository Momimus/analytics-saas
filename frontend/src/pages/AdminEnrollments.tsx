import { useCallback, useEffect, useState } from "react";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import type { AdminEnrollment } from "../lib/admin";
import { listAdminEnrollments } from "../lib/admin";
import { apiFetch, ApiError } from "../lib/api";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import { AdminPagination, AdminTable } from "../components/admin/AdminTable";
import ConfirmActionModal from "../components/admin/ConfirmActionModal";
import ToastBanner from "../components/admin/ToastBanner";

type PendingAction = {
  endpoint: string;
  method: "PATCH" | "POST";
  body: Record<string, unknown>;
  title: string;
  description: string;
  confirmLabel: string;
  requireReason: boolean;
};

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<"ALL" | "REQUESTED" | "ACTIVE" | "REVOKED">("ALL");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantCourseId, setGrantCourseId] = useState("");
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
    if (courseId.trim()) params.set("courseId", courseId.trim());
    if (userId.trim()) params.set("userId", userId.trim());
    if (status !== "ALL") params.set("status", status);

    const result = await listAdminEnrollments(params);
    setEnrollments(result.enrollments);
    setTotal(result.total);
    setTotalPages(result.totalPages);
  }, [courseId, page, pageSize, status, userId]);

  useEffect(() => {
    setLoading(true);
    load()
      .then(() => setError(null))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load enrollments"))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [courseId, userId, status, pageSize]);

  const executeAction = async (reason: string) => {
    if (!pendingAction) return;

    setActionBusy(true);
    try {
      await apiFetch(pendingAction.endpoint, {
        method: pendingAction.method,
        body: JSON.stringify({ ...pendingAction.body, reason }),
      });
      await load();
      setPendingAction(null);
      setToast({ message: "Enrollment action completed.", tone: "success" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Action failed";
      setError(message);
      setToast({ message, tone: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="grid gap-6">
      <AdminSectionNav />

      <GlassCard title="Enrollments" subtitle="Approve requests and remove access with lifecycle-safe controls.">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            placeholder="Filter by courseId"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Filter by userId"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="ALL">All status</option>
            <option value="REQUESTED">Requested</option>
            <option value="ACTIVE">Active</option>
            <option value="REVOKED">Removed</option>
          </select>
          <div className="text-xs text-[var(--text-muted)] md:flex md:items-center">
            Access removed is final in current lifecycle rules.
          </div>
        </div>

        <AdminTable
          loading={loading}
          error={error}
          hasRows={enrollments.length > 0}
          emptyMessage="No enrollments found."
          colCount={5}
        >
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Enrollment</th>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment) => {
              const isRequested = enrollment.status === "REQUESTED";
              const isActive = enrollment.status === "ACTIVE";
              const isRemoved = enrollment.status === "REVOKED";

              return (
                <tr key={enrollment.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                  <td className="px-3 py-2 text-xs">{enrollment.id}</td>
                  <td className="px-3 py-2">{enrollment.course.title}</td>
                  <td className="px-3 py-2">{enrollment.user.fullName?.trim() || enrollment.user.email}</td>
                  <td className="px-3 py-2">{isRemoved ? "Removed" : enrollment.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="h-10 px-3 py-0"
                        disabled={!isRequested}
                        title={isRemoved ? "Access removed. Create a new grant if allowed." : undefined}
                        onClick={() =>
                          setPendingAction({
                            endpoint: `/admin/enrollments/${enrollment.id}/status`,
                            method: "PATCH",
                            body: { status: "ACTIVE" },
                            title: "Approve request",
                            description: "This approves a pending access request.",
                            confirmLabel: "Approve request",
                            requireReason: true,
                          })
                        }
                      >
                        Approve request
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 px-3 py-0"
                        disabled={!isRequested && !isActive}
                        onClick={() =>
                          setPendingAction({
                            endpoint: `/admin/enrollments/${enrollment.id}/status`,
                            method: "PATCH",
                            body: { status: "REVOKED" },
                            title: "Remove access",
                            description: "This removes enrollment access and cannot be approved again.",
                            confirmLabel: "Remove access",
                            requireReason: true,
                          })
                        }
                      >
                        Remove access
                      </Button>
                    </div>
                    {isRemoved && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Access removed. Create a new grant if allowed.</p>
                    )}
                  </td>
                </tr>
              );
            })}
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

      <GlassCard title="Manual Grant Access / Remove Access" subtitle="Manage enrollment directly by userId + courseId.">
        <div className="grid gap-2 md:grid-cols-3">
          <input
            value={grantUserId}
            onChange={(event) => setGrantUserId(event.target.value)}
            placeholder="userId"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <input
            value={grantCourseId}
            onChange={(event) => setGrantCourseId(event.target.value)}
            placeholder="courseId"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              className="h-10 px-4 py-0"
              onClick={() =>
                setPendingAction({
                  endpoint: "/admin/enrollments/grant",
                  method: "POST",
                  body: { userId: grantUserId.trim(), courseId: grantCourseId.trim() },
                  title: "Grant access",
                  description: "This creates or sets ACTIVE enrollment.",
                  confirmLabel: "Grant access",
                  requireReason: true,
                })
              }
            >
              Grant access
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-4 py-0"
              onClick={() =>
                setPendingAction({
                  endpoint: "/admin/enrollments/revoke",
                  method: "POST",
                  body: { userId: grantUserId.trim(), courseId: grantCourseId.trim() },
                  title: "Remove access",
                  description: "This removes ACTIVE or REQUESTED access.",
                  confirmLabel: "Remove access",
                  requireReason: true,
                })
              }
            >
              Remove access
            </Button>
          </div>
        </div>
      </GlassCard>

      <ConfirmActionModal
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? "Confirm action"}
        description={pendingAction?.description ?? "Please confirm this change."}
        confirmLabel={pendingAction?.confirmLabel ?? "Confirm"}
        requireReason={pendingAction?.requireReason ?? false}
        busy={actionBusy}
        onClose={() => setPendingAction(null)}
        onConfirm={executeAction}
      />

      {toast && <ToastBanner message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}
