import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import type { AdminCourse } from "../lib/admin";
import { listAdminCourses, listAdminDeletionRequests } from "../lib/admin";
import { apiFetch, ApiError } from "../lib/api";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import { AdminPagination, AdminTable } from "../components/admin/AdminTable";
import ConfirmActionModal from "../components/admin/ConfirmActionModal";
import ToastBanner from "../components/admin/ToastBanner";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import Select from "../components/ui/Select";
import DateInput from "../components/ui/DateInput";

type DeletionRequest = {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  course: {
    id: string;
    title: string;
  };
  requestedBy: {
    email: string;
  };
};

type PendingAction = {
  endpoint: string;
  method: "PATCH" | "POST";
  title: string;
  description: string;
  confirmLabel: string;
  requireReason: boolean;
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [stateFilter, setStateFilter] = useState<"ALL" | "published" | "unpublished" | "archived" | "pending">("ALL");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const activeFilters = [
    ...(search.trim() ? [{ key: "search", label: "Search", value: search.trim(), onRemove: () => setSearch("") }] : []),
    ...(stateFilter !== "ALL" ? [{ key: "state", label: "State", value: stateFilter, onRemove: () => setStateFilter("ALL") }] : []),
    ...(fromDate ? [{ key: "from", label: "From", value: fromDate, onRemove: () => setFromDate("") }] : []),
    ...(toDate ? [{ key: "to", label: "To", value: toDate, onRemove: () => setToDate("") }] : []),
  ];

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (stateFilter !== "ALL") params.set("state", stateFilter);
    if (search.trim()) params.set("search", search.trim());

    const [coursesResponse, requestResponse] = await Promise.all([
      listAdminCourses(params),
      listAdminDeletionRequests(),
    ]);

    setCourses(coursesResponse.courses);
    setTotal(coursesResponse.total);
    setTotalPages(coursesResponse.totalPages);
    setDeletionRequests(requestResponse.requests as DeletionRequest[]);
  }, [page, pageSize, search, stateFilter]);

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
          setError(err instanceof Error ? err.message : "Failed to load courses");
          setErrorStatusCode(undefined);
          setErrorDetails(undefined);
        }
      })
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [stateFilter, search, pageSize]);

  const executeAction = async (reason: string) => {
    if (!pendingAction) return;

    setActionBusy(true);
    try {
      await apiFetch(pendingAction.endpoint, {
        method: pendingAction.method,
        body: JSON.stringify(
          pendingAction.endpoint.includes("delete-requests")
            ? { adminNote: reason }
            : { reason }
        ),
      });
      await load();
      setPendingAction(null);
      setToast({ message: "Course action completed.", tone: "success" });
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

  const visibleCourses = useMemo(() => {
    const fromValue = fromDate ? new Date(fromDate) : null;
    const toValue = toDate ? new Date(toDate) : null;
    if (toValue) {
      toValue.setHours(23, 59, 59, 999);
    }

    return courses.filter((course) => {
      const updatedAt = new Date(course.updatedAt);
      if (Number.isNaN(updatedAt.getTime())) return true;
      if (fromValue && updatedAt < fromValue) return false;
      if (toValue && updatedAt > toValue) return false;
      return true;
    });
  }, [courses, fromDate, toDate]);

  return (
    <div className="grid gap-5">
      <AdminSectionNav />

      <GlassCard title="Courses" subtitle="Moderation controls for publishing and archiving.">
        <AdminFilterBar
          title="Course Filters"
          helper="Refine moderation queue by state, keyword, and date window."
          activeFilterCount={activeFilters.length}
          hint="Filter by title/state and optional updated date range."
          onReset={() => {
            setSearch("");
            setStateFilter("ALL");
            setFromDate("");
            setToDate("");
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <Select
            value={stateFilter}
            onChange={(next) => setStateFilter(next as typeof stateFilter)}
            ariaLabel="Filter courses by state"
            items={[
              { label: "All", value: "ALL" },
              { label: "Published", value: "published" },
              { label: "Unpublished", value: "unpublished" },
              { label: "Archived", value: "archived" },
              { label: "Pending requests", value: "pending" },
            ]}
          />
          <DateInput value={fromDate} onChange={setFromDate} placeholder="From date" ariaLabel="Courses from date" />
          <DateInput value={toDate} onChange={setToDate} placeholder="To date" ariaLabel="Courses to date" />
        </AdminFilterBar>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Publish and archive actions are moderation events and require a reason.
        </p>

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
            setStateFilter("ALL");
            setFromDate("");
            setToDate("");
          }}
          hasRows={visibleCourses.length > 0}
          emptyMessage="No results. Adjust filters or clear date range."
          colCount={4}
          emptyAction={
            <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" onClick={() => void load()}>
              Reload Courses
            </Button>
          }
        >
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Counts</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCourses.map((course) => (
              <tr key={course.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2">
                  <p className="font-medium">{course.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">Owner: {course.createdBy?.email ?? "Unknown"}</p>
                </td>
                <td className="px-3 py-2">
                  {course.archivedAt ? "Archived" : course.isPublished ? "Published" : "Draft"}
                </td>
                <td className="px-3 py-2">
                  Lessons: {course._count.lessons} | Enrollments: {course._count.enrollments}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 px-2.5 py-0 text-xs"
                      onClick={() =>
                        setPendingAction({
                          endpoint: `/admin/courses/${course.id}/${course.isPublished ? "unpublish" : "publish"}`,
                          method: "PATCH",
                          title: course.isPublished ? "Unpublish course" : "Publish course",
                          description: "This moderation action will be recorded in audit logs.",
                          confirmLabel: course.isPublished ? "Unpublish" : "Publish",
                          requireReason: true,
                        })
                      }
                    >
                      {course.isPublished ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 px-2.5 py-0 text-xs"
                      onClick={() =>
                        setPendingAction({
                          endpoint: `/admin/courses/${course.id}/archive`,
                          method: "PATCH",
                          title: "Archive course",
                          description: "This will remove the course from active use.",
                          confirmLabel: "Archive",
                          requireReason: true,
                        })
                      }
                    >
                      Archive
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

      <GlassCard title="Deletion Requests" subtitle="Approve request or reject request from instructors.">
        {deletionRequests.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No deletion requests.</p>
        ) : (
          <div className="grid gap-3">
            {deletionRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-3"
              >
                <p className="text-sm font-semibold text-[var(--text)]">{request.course.title}</p>
                <p className="text-xs text-[var(--text-muted)]">Requested by {request.requestedBy.email}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{request.reason}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="h-9 px-2.5 py-0 text-xs"
                    disabled={request.status !== "PENDING"}
                    onClick={() =>
                      setPendingAction({
                        endpoint: `/admin/delete-requests/${request.id}/approve`,
                        method: "POST",
                        title: "Approve request",
                        description: "This archives the course and approves the deletion request.",
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
                    disabled={request.status !== "PENDING"}
                    onClick={() =>
                      setPendingAction({
                        endpoint: `/admin/delete-requests/${request.id}/reject`,
                        method: "POST",
                        title: "Reject request",
                        description: "This rejects the deletion request.",
                        confirmLabel: "Reject request",
                        requireReason: true,
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
      </GlassCard>

      <ConfirmActionModal
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? "Confirm action"}
        description={pendingAction?.description ?? "Please confirm."}
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

