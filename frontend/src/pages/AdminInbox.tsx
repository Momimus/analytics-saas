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
import AdminFilterBar from "../components/admin/AdminFilterBar";
import MobileActionMenu from "../components/admin/MobileActionMenu";
import Select from "../components/ui/Select";
import DateInput from "../components/ui/DateInput";

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
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"ALL" | "ENROLLMENT" | "DELETION">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const activeFilters = [
    ...(query.trim() ? [{ key: "query", label: "Search", value: query.trim(), onRemove: () => setQuery("") }] : []),
    ...(kindFilter !== "ALL" ? [{ key: "kind", label: "Kind", value: kindFilter, onRemove: () => setKindFilter("ALL") }] : []),
    ...(fromDate ? [{ key: "from", label: "From", value: fromDate, onRemove: () => setFromDate("") }] : []),
    ...(toDate ? [{ key: "to", label: "To", value: toDate, onRemove: () => setToDate("") }] : []),
  ];

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
          setError(err instanceof Error ? err.message : "Failed to load inbox");
          setErrorStatusCode(undefined);
          setErrorDetails(undefined);
        }
      })
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
      setErrorStatusCode(err instanceof ApiError ? err.status : undefined);
      setErrorDetails(err instanceof ApiError ? err.code : undefined);
      setToast({ message, tone: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const inboxTotal = useMemo(() => total + deletionRequests.length, [total, deletionRequests.length]);

  const visibleEnrollments = useMemo(() => {
    const fromValue = fromDate ? new Date(fromDate) : null;
    const toValue = toDate ? new Date(toDate) : null;
    if (toValue) toValue.setHours(23, 59, 59, 999);
    const term = query.trim().toLowerCase();

    return enrollments.filter((item) => {
      if (kindFilter === "DELETION") return false;
      const createdAt = new Date(item.createdAt);
      if (fromValue && createdAt < fromValue) return false;
      if (toValue && createdAt > toValue) return false;
      if (!term) return true;
      const haystack = `${item.course.title} ${item.user.fullName ?? ""} ${item.user.email} ${item.id}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [enrollments, fromDate, toDate, query, kindFilter]);

  const visibleDeletionRequests = useMemo(() => {
    const fromValue = fromDate ? new Date(fromDate) : null;
    const toValue = toDate ? new Date(toDate) : null;
    if (toValue) toValue.setHours(23, 59, 59, 999);
    const term = query.trim().toLowerCase();

    return deletionRequests.filter((item) => {
      if (kindFilter === "ENROLLMENT") return false;
      const createdAt = new Date(item.createdAt);
      if (fromValue && createdAt < fromValue) return false;
      if (toValue && createdAt > toValue) return false;
      if (!term) return true;
      const haystack = `${item.course.title} ${item.requestedBy.fullName ?? ""} ${item.requestedBy.email} ${item.reason} ${item.id}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [deletionRequests, fromDate, toDate, query, kindFilter]);

  return (
    <div className="grid gap-5">
      <AdminSectionNav />

      <GlassCard title="Action Inbox" subtitle={`Pending actions: ${inboxTotal}`}>
        <p className="text-xs text-[var(--text-muted)]">All inbox actions require a reason and are audit logged.</p>
      </GlassCard>

      <AdminFilterBar
        title="Inbox Filters"
        helper="Filter pending moderation items across enrollments and deletions."
        activeFilterCount={activeFilters.length}
        hint="Filter inbox items by keyword, type, and submitted date."
        onReset={() => {
          setQuery("");
          setKindFilter("ALL");
          setFromDate("");
          setToDate("");
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search course, user, reason, or id"
          className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
        />
        <Select
          value={kindFilter}
          onChange={(next) => setKindFilter(next as typeof kindFilter)}
          ariaLabel="Filter inbox item type"
          items={[
            { label: "All types", value: "ALL" },
            { label: "Enrollment requests", value: "ENROLLMENT" },
            { label: "Deletion requests", value: "DELETION" },
          ]}
        />
        <DateInput value={fromDate} onChange={setFromDate} placeholder="From date" ariaLabel="Inbox from date" />
        <DateInput value={toDate} onChange={setToDate} placeholder="To date" ariaLabel="Inbox to date" />
      </AdminFilterBar>

      <GlassCard title="Pending Enrollment Requests" subtitle="Approve request or remove access.">
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
            setQuery("");
            setKindFilter("ALL");
            setFromDate("");
            setToDate("");
          }}
          hasRows={visibleEnrollments.length > 0}
          emptyMessage="No pending requests match current filters."
          colCount={5}
          responsiveMode="stack"
          mobileStack={
            <div className="grid gap-2.5">
              {visibleEnrollments.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/40 p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text)]">{item.course.title}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{item.user.fullName?.trim() || item.user.email}</p>
                    </div>
                    <MobileActionMenu
                      items={[
                        {
                          label: "Approve request",
                          onSelect: () => {
                            setPendingAction({
                              title: "Approve request",
                              description: "Approve this pending enrollment request.",
                              confirmLabel: "Approve request",
                              endpoint: `/admin/enrollments/${item.id}/status`,
                              method: "PATCH",
                              payload: { status: "ACTIVE" },
                              itemId: item.id,
                              kind: "enrollment",
                            });
                          },
                        },
                        {
                          label: "Remove access",
                          onSelect: () => {
                            setPendingAction({
                              title: "Remove access",
                              description: "Remove access for this enrollment request.",
                              confirmLabel: "Remove access",
                              endpoint: `/admin/enrollments/${item.id}/status`,
                              method: "PATCH",
                              payload: { status: "REVOKED" },
                              itemId: item.id,
                              kind: "enrollment",
                            });
                          },
                        },
                      ]}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Enrollment: {item.id}</p>
                  <p className="text-xs text-[var(--text-muted)]">Requested: {new Date(item.createdAt).toLocaleString()}</p>
                </article>
              ))}
            </div>
          }
          emptyAction={
            <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" onClick={() => void load()}>
              Reload Inbox
            </Button>
          }
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
            {visibleEnrollments.map((item) => (
              <tr key={item.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2 text-xs">{item.id}</td>
                <td className="px-3 py-2">{item.course.title}</td>
                <td className="px-3 py-2">{item.user.fullName?.trim() || item.user.email}</td>
                <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <MobileActionMenu
                    items={[
                      {
                        label: "Approve request",
                        onSelect: () => {
                          setPendingAction({
                            title: "Approve request",
                            description: "Approve this pending enrollment request.",
                            confirmLabel: "Approve request",
                            endpoint: `/admin/enrollments/${item.id}/status`,
                            method: "PATCH",
                            payload: { status: "ACTIVE" },
                            itemId: item.id,
                            kind: "enrollment",
                          });
                        },
                      },
                      {
                        label: "Remove access",
                        onSelect: () => {
                          setPendingAction({
                            title: "Remove access",
                            description: "Remove access for this enrollment request.",
                            confirmLabel: "Remove access",
                            endpoint: `/admin/enrollments/${item.id}/status`,
                            method: "PATCH",
                            payload: { status: "REVOKED" },
                            itemId: item.id,
                            kind: "enrollment",
                          });
                        },
                      },
                    ]}
                  />
                  <div className="hidden flex-wrap gap-2 sm:flex">
                    <Button
                      type="button"
                      className="h-9 px-2.5 py-0 text-xs"
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
                      className="h-9 px-2.5 py-0 text-xs"
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
          errorStatusCode={errorStatusCode}
          errorDetails={errorDetails}
          onRetry={() => void load()}
          stickyHeader
          zebraRows
          appliedFilters={activeFilters}
          onClearFilters={() => {
            setQuery("");
            setKindFilter("ALL");
            setFromDate("");
            setToDate("");
          }}
          hasRows={visibleDeletionRequests.length > 0}
          emptyMessage="No pending deletion requests match current filters."
          colCount={5}
          responsiveMode="stack"
          mobileStack={
            <div className="grid gap-2.5">
              {visibleDeletionRequests.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/40 p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text)]">{item.course.title}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{item.requestedBy.fullName?.trim() || item.requestedBy.email}</p>
                    </div>
                    <MobileActionMenu
                      items={[
                        {
                          label: "Approve request",
                          onSelect: () => {
                            setPendingAction({
                              title: "Approve request",
                              description: "Approve this deletion request and archive the course.",
                              confirmLabel: "Approve request",
                              endpoint: `/admin/delete-requests/${item.id}/approve`,
                              method: "POST",
                              payload: {},
                              itemId: item.id,
                              kind: "deletion",
                            });
                          },
                        },
                        {
                          label: "Reject request",
                          onSelect: () => {
                            setPendingAction({
                              title: "Reject request",
                              description: "Reject this deletion request.",
                              confirmLabel: "Reject request",
                              endpoint: `/admin/delete-requests/${item.id}/reject`,
                              method: "POST",
                              payload: {},
                              itemId: item.id,
                              kind: "deletion",
                            });
                          },
                        },
                      ]}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Request: {item.id}</p>
                  <p className="line-clamp-2 text-xs text-[var(--text-muted)]">Reason: {item.reason}</p>
                </article>
              ))}
            </div>
          }
          emptyAction={
            <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" onClick={() => void load()}>
              Reload Inbox
            </Button>
          }
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
            {visibleDeletionRequests.map((item) => (
              <tr key={item.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2 text-xs">{item.id}</td>
                <td className="px-3 py-2">{item.course.title}</td>
                <td className="px-3 py-2">{item.requestedBy.fullName?.trim() || item.requestedBy.email}</td>
                <td className="px-3 py-2">{item.reason}</td>
                <td className="px-3 py-2">
                  <MobileActionMenu
                    items={[
                      {
                        label: "Approve request",
                        onSelect: () => {
                          setPendingAction({
                            title: "Approve request",
                            description: "Approve this deletion request and archive the course.",
                            confirmLabel: "Approve request",
                            endpoint: `/admin/delete-requests/${item.id}/approve`,
                            method: "POST",
                            payload: {},
                            itemId: item.id,
                            kind: "deletion",
                          });
                        },
                      },
                      {
                        label: "Reject request",
                        onSelect: () => {
                          setPendingAction({
                            title: "Reject request",
                            description: "Reject this deletion request.",
                            confirmLabel: "Reject request",
                            endpoint: `/admin/delete-requests/${item.id}/reject`,
                            method: "POST",
                            payload: {},
                            itemId: item.id,
                            kind: "deletion",
                          });
                        },
                      },
                    ]}
                  />
                  <div className="hidden flex-wrap gap-2 sm:flex">
                    <Button
                      type="button"
                      className="h-9 px-2.5 py-0 text-xs"
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
                      className="h-9 px-2.5 py-0 text-xs"
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

