import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import ConfirmActionModal from "../components/admin/ConfirmActionModal";
import ToastBanner from "../components/admin/ToastBanner";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import StatCard from "../components/ui/StatCard";
import type { AdminEnrollment, AdminMetrics, AuditLog } from "../lib/admin";
import {
  getAdminMetrics,
  listAdminAuditLogs,
  listAdminDeletionRequests,
  listAdminEnrollments,
} from "../lib/admin";
import { apiFetch, ApiError } from "../lib/api";

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
  kind: "enrollment" | "deletion";
  itemId: string;
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<AdminEnrollment[]>([]);
  const [pendingDeletionRequests, setPendingDeletionRequests] = useState<PendingDeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditEntityFilter, setAuditEntityFilter] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    const auditParams = new URLSearchParams();
    auditParams.set("page", "1");
    auditParams.set("pageSize", "10");
    if (auditActionFilter.trim()) auditParams.set("action", auditActionFilter.trim());
    if (auditEntityFilter.trim()) auditParams.set("entityType", auditEntityFilter.trim());

    const enrollmentParams = new URLSearchParams();
    enrollmentParams.set("page", "1");
    enrollmentParams.set("pageSize", "5");
    enrollmentParams.set("status", "REQUESTED");

    const deletionParams = new URLSearchParams();
    deletionParams.set("status", "PENDING");

    const [metricsResponse, logsResponse, enrollmentsResponse, deletionResponse] = await Promise.all([
      getAdminMetrics(),
      listAdminAuditLogs(auditParams),
      listAdminEnrollments(enrollmentParams),
      listAdminDeletionRequests(deletionParams),
    ]);

    setMetrics(metricsResponse);
    setAuditLogs(logsResponse.logs);
    setPendingEnrollments(enrollmentsResponse.enrollments);
    setPendingDeletionRequests((deletionResponse.requests as PendingDeletionRequest[]).slice(0, 5));
  }, [auditActionFilter, auditEntityFilter]);

  useEffect(() => {
    setLoading(true);
    load()
      .then(() => {
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load admin dashboard");
      })
      .finally(() => setLoading(false));
  }, [load]);

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
        setPendingEnrollments((prev) => prev.filter((item) => item.id !== pendingAction.itemId));
      } else {
        setPendingDeletionRequests((prev) => prev.filter((item) => item.id !== pendingAction.itemId));
      }

      setPendingAction(null);
      setToast({ message: "Action completed.", tone: "success" });
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Action failed";
      setError(message);
      setToast({ message, tone: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="grid gap-5">
      <AdminSectionNav />

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">System Overview</h2>
          <span className="text-xs text-[var(--text-muted)]">Live moderation indicators</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard loading={loading} label="Pending Enrollments" value={metrics?.enrollments.pendingRequests ?? "--"} hint="Awaiting decision" />
          <StatCard loading={loading} label="Pending Deletions" value={metrics?.deletionRequests.pending ?? "--"} hint="Course archive queue" />
          <StatCard loading={loading} label="Suspended Users" value={metrics?.users.suspended ?? "--"} hint="Account moderation" />
          <StatCard loading={loading} label="Published Courses" value={metrics?.courses.published ?? "--"} hint="Visible catalog" />
          <StatCard loading={loading} label="Unpublished Courses" value={metrics?.courses.unpublished ?? "--"} hint="Draft/private" />
          <StatCard loading={loading} label="Archived Courses" value={metrics?.courses.archived ?? "--"} hint="Retained history" />
          <StatCard loading={loading} label="Total Instructors" value={metrics?.instructors.total ?? "--"} hint="Creator accounts" />
          <StatCard loading={loading} label="Suspended Instructors" value={metrics?.instructors.suspended ?? "--"} hint="Restricted creators" />
        </div>
      </section>

      <GlassCard title="Recent Activity" subtitle="Latest admin audit events with quick filters.">
        <div className="mb-2.5 grid gap-1.5 md:grid-cols-3">
          <input
            value={auditActionFilter}
            onChange={(event) => setAuditActionFilter(event.target.value)}
            placeholder="Filter action"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <input
            value={auditEntityFilter}
            onChange={(event) => setAuditEntityFilter(event.target.value)}
            placeholder="Filter entity type"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <Button type="button" className="h-9 px-3 py-0 text-xs" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No recent activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Actor</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                    <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{log.action}</td>
                    <td className="px-3 py-2">{log.entityType}{log.entityId ? `:${log.entityId}` : ""}</td>
                    <td className="px-3 py-2">{log.actorId ?? "system"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <GlassCard
        title="Action Inbox"
        subtitle="Pending enrollment and deletion request actions."
        actions={<Link to="/admin/inbox" className="text-sm text-[var(--accent)] hover:underline">Open full inbox</Link>}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] p-3">
            <h3 className="text-sm font-semibold text-[var(--text)]">Pending enrollments</h3>
            {pendingEnrollments.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">No pending enrollment requests.</p>
            ) : (
              <div className="mt-2 grid gap-2">
                {pendingEnrollments.map((item) => (
                  <div key={item.id} className="rounded-[var(--radius-sm)] border border-[color:var(--border)] px-3 py-2">
                    <p className="text-sm text-[var(--text)]">{item.user.fullName?.trim() || item.user.email}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.course.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="h-10 px-3 py-0"
                        onClick={() =>
                          setPendingAction({
                            title: "Approve request",
                            description: "Approve this enrollment request.",
                            confirmLabel: "Approve request",
                            endpoint: `/admin/enrollments/${item.id}/status`,
                            method: "PATCH",
                            payload: { status: "ACTIVE" },
                            kind: "enrollment",
                            itemId: item.id,
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
                            description: "Remove this pending enrollment request.",
                            confirmLabel: "Remove access",
                            endpoint: `/admin/enrollments/${item.id}/status`,
                            method: "PATCH",
                            payload: { status: "REVOKED" },
                            kind: "enrollment",
                            itemId: item.id,
                          })
                        }
                      >
                        Remove access
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] p-3">
            <h3 className="text-sm font-semibold text-[var(--text)]">Pending deletion requests</h3>
            {pendingDeletionRequests.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">No pending deletion requests.</p>
            ) : (
              <div className="mt-2 grid gap-2">
                {pendingDeletionRequests.map((item) => (
                  <div key={item.id} className="rounded-[var(--radius-sm)] border border-[color:var(--border)] px-3 py-2">
                    <p className="text-sm text-[var(--text)]">{item.course.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.requestedBy.fullName?.trim() || item.requestedBy.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
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
                            kind: "deletion",
                            itemId: item.id,
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
                            kind: "deletion",
                            itemId: item.id,
                          })
                        }
                      >
                        Reject request
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
