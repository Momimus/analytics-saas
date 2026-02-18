import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import type { AdminEnrollment } from "../lib/admin";
import { listAdminEnrollments } from "../lib/admin";
import { apiFetch, ApiError } from "../lib/api";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import { AdminPagination, AdminTable } from "../components/admin/AdminTable";
import ConfirmActionModal from "../components/admin/ConfirmActionModal";
import ToastBanner from "../components/admin/ToastBanner";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import MobileActionMenu from "../components/admin/MobileActionMenu";
import Select from "../components/ui/Select";
import DateInput from "../components/ui/DateInput";

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
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [courseId, setCourseId] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<"ALL" | "REQUESTED" | "ACTIVE" | "REVOKED">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantCourseId, setGrantCourseId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const activeFilters = [
    ...(courseId.trim() ? [{ key: "course", label: "Course", value: courseId.trim(), onRemove: () => setCourseId("") }] : []),
    ...(userId.trim() ? [{ key: "user", label: "User", value: userId.trim(), onRemove: () => setUserId("") }] : []),
    ...(status !== "ALL" ? [{ key: "status", label: "Status", value: status, onRemove: () => setStatus("ALL") }] : []),
    ...(fromDate ? [{ key: "from", label: "From", value: fromDate, onRemove: () => setFromDate("") }] : []),
    ...(toDate ? [{ key: "to", label: "To", value: toDate, onRemove: () => setToDate("") }] : []),
  ];

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
          setError(err instanceof Error ? err.message : "Failed to load enrollments");
          setErrorStatusCode(undefined);
          setErrorDetails(undefined);
        }
      })
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
      setErrorStatusCode(err instanceof ApiError ? err.status : undefined);
      setErrorDetails(err instanceof ApiError ? err.code : undefined);
      setToast({ message, tone: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const visibleEnrollments = useMemo(() => {
    const fromValue = fromDate ? new Date(fromDate) : null;
    const toValue = toDate ? new Date(toDate) : null;
    if (toValue) toValue.setHours(23, 59, 59, 999);

    return enrollments.filter((enrollment) => {
      const createdAt = new Date(enrollment.createdAt);
      if (Number.isNaN(createdAt.getTime())) return true;
      if (fromValue && createdAt < fromValue) return false;
      if (toValue && createdAt > toValue) return false;
      return true;
    });
  }, [enrollments, fromDate, toDate]);

  return (
    <div className="grid gap-5">
      <AdminSectionNav />

      <GlassCard title="Enrollments" subtitle="Approve requests and remove access with lifecycle-safe controls.">
        <AdminFilterBar
          title="Enrollment Filters"
          helper="Find requests and active/revoked records quickly."
          activeFilterCount={activeFilters.length}
          hint="Filter enrollments by identifiers, status, and created date."
          onReset={() => {
            setCourseId("");
            setUserId("");
            setStatus("ALL");
            setFromDate("");
            setToDate("");
          }}
        >
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
          <Select
            value={status}
            onChange={(next) => setStatus(next as typeof status)}
            ariaLabel="Filter enrollments by status"
            items={[
              { label: "All status", value: "ALL" },
              { label: "Requested", value: "REQUESTED" },
              { label: "Active", value: "ACTIVE" },
              { label: "Removed", value: "REVOKED" },
            ]}
          />
          <DateInput value={fromDate} onChange={setFromDate} placeholder="From date" ariaLabel="Enrollments from date" />
          <DateInput value={toDate} onChange={setToDate} placeholder="To date" ariaLabel="Enrollments to date" />
          <div className="text-xs text-[var(--text-muted)] md:flex md:items-center">
            Access removed is final in current lifecycle rules.
          </div>
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
            setCourseId("");
            setUserId("");
            setStatus("ALL");
            setFromDate("");
            setToDate("");
          }}
          hasRows={visibleEnrollments.length > 0}
          emptyMessage="No results. Try widening filters or clear date range."
          colCount={5}
          responsiveMode="stack"
          mobileStack={
            <div className="grid gap-2.5">
              {visibleEnrollments.map((enrollment) => {
                const isRequested = enrollment.status === "REQUESTED";
                const isActive = enrollment.status === "ACTIVE";
                const isRemoved = enrollment.status === "REVOKED";

                return (
                  <article
                    key={enrollment.id}
                    className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/40 p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text)]">{enrollment.course.title}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">{enrollment.user.fullName?.trim() || enrollment.user.email}</p>
                      </div>
                      <MobileActionMenu
                        items={[
                          {
                            label: "Approve request",
                            disabled: !isRequested,
                            onSelect: () => {
                              setPendingAction({
                                endpoint: `/admin/enrollments/${enrollment.id}/status`,
                                method: "PATCH",
                                body: { status: "ACTIVE" },
                                title: "Approve request",
                                description: "This approves a pending access request.",
                                confirmLabel: "Approve request",
                                requireReason: true,
                              });
                            },
                          },
                          {
                            label: "Remove access",
                            disabled: !isRequested && !isActive,
                            onSelect: () => {
                              setPendingAction({
                                endpoint: `/admin/enrollments/${enrollment.id}/status`,
                                method: "PATCH",
                                body: { status: "REVOKED" },
                                title: "Remove access",
                                description: "This removes enrollment access and cannot be approved again.",
                                confirmLabel: "Remove access",
                                requireReason: true,
                              });
                            },
                          },
                        ]}
                      />
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-[var(--text-muted)]">
                      <p>ID: <span className="text-[var(--text)]">{enrollment.id}</span></p>
                      <p>Status: <span className="text-[var(--text)]">{isRemoved ? "Removed" : enrollment.status}</span></p>
                    </div>
                    {isRemoved ? (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Access removed. Create a new grant if allowed.</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          }
          emptyAction={
            <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" onClick={() => void load()}>
              Reload Enrollments
            </Button>
          }
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
            {visibleEnrollments.map((enrollment) => {
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
                    <MobileActionMenu
                      items={[
                        {
                          label: "Approve request",
                          disabled: !isRequested,
                          onSelect: () => {
                            setPendingAction({
                              endpoint: `/admin/enrollments/${enrollment.id}/status`,
                              method: "PATCH",
                              body: { status: "ACTIVE" },
                              title: "Approve request",
                              description: "This approves a pending access request.",
                              confirmLabel: "Approve request",
                              requireReason: true,
                            });
                          },
                        },
                        {
                          label: "Remove access",
                          disabled: !isRequested && !isActive,
                          onSelect: () => {
                            setPendingAction({
                              endpoint: `/admin/enrollments/${enrollment.id}/status`,
                              method: "PATCH",
                              body: { status: "REVOKED" },
                              title: "Remove access",
                              description: "This removes enrollment access and cannot be approved again.",
                              confirmLabel: "Remove access",
                              requireReason: true,
                            });
                          },
                        },
                      ]}
                    />
                    <div className="hidden flex-wrap gap-2 sm:flex">
                      <Button
                        type="button"
                        className="h-9 px-2.5 py-0 text-xs"
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
                        className="h-9 px-2.5 py-0 text-xs"
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
              className="h-9 px-3 py-0 text-xs"
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
              className="h-9 px-3 py-0 text-xs"
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

