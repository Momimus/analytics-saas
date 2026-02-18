import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import ConfirmActionModal from "../components/admin/ConfirmActionModal";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import { AdminPagination, AdminTable } from "../components/admin/AdminTable";
import ToastBanner from "../components/admin/ToastBanner";
import GlassCard from "../components/ui/GlassCard";
import Select from "../components/ui/Select";
import type { AdminInstructorListItem } from "../lib/admin";
import { listAdminInstructors } from "../lib/admin";
import { apiFetch, ApiError } from "../lib/api";

type PendingAction = {
  endpoint: string;
  method: "PATCH";
  title: string;
  description: string;
  confirmLabel: string;
  itemId: string;
};

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = useState<AdminInstructorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "active" | "suspended">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const activeFilters = [
    ...(search.trim() ? [{ key: "search", label: "Search", value: search.trim(), onRemove: () => setSearch("") }] : []),
    ...(status !== "ALL" ? [{ key: "status", label: "Status", value: status, onRemove: () => setStatus("ALL") }] : []),
  ];

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search.trim()) params.set("search", search.trim());
    if (status !== "ALL") params.set("status", status);

    const result = await listAdminInstructors(params);
    setInstructors(result.instructors);
    setTotal(result.total);
    setTotalPages(result.totalPages);
  }, [page, pageSize, search, status]);

  useEffect(() => {
    setLoading(true);
    load()
      .then(() => setError(null))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load instructors"))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, status, pageSize]);

  const executeAction = async (reason: string) => {
    if (!pendingAction) return;

    setActionBusy(true);
    try {
      await apiFetch(pendingAction.endpoint, {
        method: pendingAction.method,
        body: JSON.stringify({ reason }),
      });

      setInstructors((prev) =>
        prev.map((item) =>
          item.id === pendingAction.itemId
            ? {
                ...item,
                suspendedAt: pendingAction.endpoint.endsWith("/activate") ? null : new Date().toISOString(),
              }
            : item
        )
      );

      setPendingAction(null);
      setToast({ message: "Instructor status updated.", tone: "success" });
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

      <GlassCard title="Instructors" subtitle="Oversight for instructor status, courses, and students.">
        <AdminFilterBar
          title="Instructor Filters"
          helper="Search instructor roster and moderation state."
          activeFilterCount={activeFilters.length}
          hint="Find instructors by account identity and moderation status."
          onReset={() => {
            setSearch("");
            setStatus("ALL");
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
            placeholder="Search by name/email"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <Select
            value={status}
            onChange={(next) => setStatus(next as typeof status)}
            ariaLabel="Filter instructors by status"
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
          stickyHeader
          zebraRows
          appliedFilters={activeFilters}
          onClearFilters={() => {
            setSearch("");
            setStatus("ALL");
          }}
          hasRows={instructors.length > 0}
          emptyMessage="No instructors found."
          colCount={6}
        >
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Instructor</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Courses</th>
              <th className="px-3 py-2">Published</th>
              <th className="px-3 py-2">Students</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {instructors.map((instructor) => (
              <tr key={instructor.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2">
                  <p className="font-medium">{instructor.fullName?.trim() || instructor.email}</p>
                  <p className="text-xs text-[var(--text-muted)]">{instructor.email}</p>
                </td>
                <td className="px-3 py-2">{instructor.suspendedAt ? "Suspended" : "Active"}</td>
                <td className="px-3 py-2">{instructor.totalCourses}</td>
                <td className="px-3 py-2">{instructor.publishedCourses}</td>
                <td className="px-3 py-2">{instructor.totalStudents}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/admin/instructors/${instructor.id}`}
                      className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[color:var(--border)] px-2.5 text-xs text-[var(--text-muted)] hover:bg-[color:var(--surface-strong)] hover:text-[var(--text)]"
                    >
                      View
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 px-2.5 py-0 text-xs"
                      onClick={() =>
                        setPendingAction({
                          endpoint: `/admin/users/${instructor.id}/${instructor.suspendedAt ? "activate" : "suspend"}`,
                          method: "PATCH",
                          title: instructor.suspendedAt ? "Activate instructor" : "Suspend instructor",
                          description: "This moderation action will be audit logged.",
                          confirmLabel: instructor.suspendedAt ? "Activate" : "Suspend",
                          itemId: instructor.id,
                        })
                      }
                    >
                      {instructor.suspendedAt ? "Activate" : "Suspend"}
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

