import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import GlassCard from "../components/ui/GlassCard";
import type { AdminEnrollment } from "../lib/admin";
import { listAdminDeletionRequests, listAdminEnrollments } from "../lib/admin";
import { apiFetch, ApiError } from "../lib/api";
import ConfirmActionModal from "../components/admin/ConfirmActionModal";
import ToastBanner from "../components/admin/ToastBanner";
import { AdminPagination, AdminTable } from "../components/admin/AdminTable";

type PendingDeletionRequest = {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  course: { id: string; title: string };
  requestedBy: { id: string; email: string; fullName: string | null };
};

type PendingAction = {
  title: string;
  description: string;
  confirmLabel: string;
  endpoint: string;
  method: "PATCH" | "POST";
  payload: Record<string, unknown>;
  itemId: string;
  kind: "enrollment" | "deletion";
};

export default function AdminInboxPage() {
  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<PendingDeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    const enrollmentParams = new URLSearchParams();
    enrollmentParams.set("page", String(page));
    enrollmentParams.set("pageSize", String(pageSize));
    enrollmentParams.set("status", "REQUESTED");

    const deletionParams = new URLSearchParams();
    deletionParams.set("status", "PENDING");

    const [pendingEnrollments, pendingDeletionRequestsResponse] = await Promise.all([
      listAdminEnrollments(enrollmentParams),
      listAdminDeletionRequests(deletionParams),
    ]);

    setEnrollments(pendingEnrollments.enrollments);
    setTotal(pendingEnrollments.total);
    setTotalPages(pendingEnrollments.totalPages);
    setDeletionRequests(pendingDeletionRequestsResponse.requests as PendingDeletionRequest[]);
  }, [page, pageSize]);

  useEffect(() => {
    setLoading(true);
    load()
      .then(() => setError(null))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load inbox"))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const executeAction = async (reason: string) => {
    if (!pendingAction) return;

    setActionBusy(true);
    try {
      await apiFetch(pendingAction.endpoint, {
        method: pendingAction.method,
        body: JSON.stringify(
          pendingAction.kind === "deletion"
            ? { ...pendingAction.payload, adminNote: reason }
            : { ...pendingAction.payload, reason }
        ),
      });

      if (pendingAction.kind === "enrollment") {
        setEnrollments((prev) => prev.filter((item) => item.id !== pendingAction.itemId));
      } else {
        setDeletionRequests((prev) => prev.filter((item) => item.id !== pendingAction.itemId));
      }

      setPendingAction(null);
      setToast({ message: "Inbox action completed.", tone: "success" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Action failed";
      setError(message);
      setToast({ message, tone: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const inboxTotal = useMemo(() => total + deletionRequests.length, [total, deletionRequests.length]);

  return (
    <div className="grid gap-6">
      <AdminSectionNav />

      <GlassCard title="Action Inbox" subtitle={`Pending actions: ${inboxTotal}`}>
        <p className="text-xs text-[var(--text-muted)]">All inbox actions require a reason and are audit logged.</p>
      </GlassCard>

      <GlassCard title="Pending Enrollment Requests" subtitle="Approve request or remove access.">
        <AdminTable
          loading={loading}
          error={error}
          hasRows={enrollments.length > 0}
          emptyMessage="No pending enrollment requests."
          colCount={5}
        >
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Enrollment</th>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Requested</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((item) => (
              <tr key={item.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2 text-xs">{item.id}</td>
                <td className="px-3 py-2">{item.course.title}</td>
                <td className="px-3 py-2">{item.user.fullName?.trim() || item.user.email}</td>
                <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="h-10 px-3 py-0"
                      onClick={() =>
                        setPendingAction({
                          title: "Approve request",
                          description: "Approve this pending enrollment request.",
                          confirmLabel: "Approve request",
                          endpoint: `/admin/enrollments/${item.id}/status`,
                          method: "PATCH",
                          payload: { status: "ACTIVE" },
                          itemId: item.id,
                          kind: "enrollment",
                        })
                      }
                    >
                      Approve request
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 px-3 py-0"
                      onClick={() =>
                        setPendingAction({
                          title: "Remove access",
                          description: "Remove access for this enrollment request.",
                          confirmLabel: "Remove access",
                          endpoint: `/admin/enrollments/${item.id}/status`,
                          method: "PATCH",
                          payload: { status: "REVOKED" },
                          itemId: item.id,
                          kind: "enrollment",
                        })
                      }
                    >
                      Remove access
                    </Button>
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

      <GlassCard title="Pending Deletion Requests" subtitle="Approve request or reject request.">
        <AdminTable
          loading={loading}
          error={error}
          hasRows={deletionRequests.length > 0}
          emptyMessage="No pending deletion requests."
          colCount={5}
        >
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Request</th>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Requested By</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deletionRequests.map((item) => (
              <tr key={item.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2 text-xs">{item.id}</td>
                <td className="px-3 py-2">{item.course.title}</td>
                <td className="px-3 py-2">{item.requestedBy.fullName?.trim() || item.requestedBy.email}</td>
                <td className="px-3 py-2">{item.reason}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="h-10 px-3 py-0"
                      onClick={() =>
                        setPendingAction({
                          title: "Approve request",
                          description: "Approve this deletion request and archive the course.",
                          confirmLabel: "Approve request",
                          endpoint: `/admin/delete-requests/${item.id}/approve`,
                          method: "POST",
                          payload: {},
                          itemId: item.id,
                          kind: "deletion",
                        })
                      }
                    >
                      Approve request
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 px-3 py-0"
                      onClick={() =>
                        setPendingAction({
                          title: "Reject request",
                          description: "Reject this deletion request.",
                          confirmLabel: "Reject request",
                          endpoint: `/admin/delete-requests/${item.id}/reject`,
                          method: "POST",
                          payload: {},
                          itemId: item.id,
                          kind: "deletion",
                        })
                      }
                    >
                      Reject request
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </GlassCard>

      <ConfirmActionModal
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? "Confirm action"}
        description={pendingAction?.description ?? "Please confirm this action."}
        confirmLabel={pendingAction?.confirmLabel ?? "Confirm"}
        requireReason
        busy={actionBusy}
        onClose={() => setPendingAction(null)}
        onConfirm={executeAction}
      />

      {toast && <ToastBanner message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}
