import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/Button";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import ConfirmActionModal from "../components/admin/ConfirmActionModal";
import { AdminPagination, AdminTable } from "../components/admin/AdminTable";
import ToastBanner from "../components/admin/ToastBanner";
import GlassCard from "../components/ui/GlassCard";
import Select from "../components/ui/Select";
import StatCard from "../components/ui/StatCard";
import type { AdminCourse, AdminInstructorDetail, AdminInstructorStudent } from "../lib/admin";
import { getAdminInstructor, listAdminInstructorCourses, listAdminInstructorStudents } from "../lib/admin";
import { apiFetch, ApiError } from "../lib/api";

type PendingAction = {
  endpoint: string;
  method: "PATCH";
  title: string;
  description: string;
  confirmLabel: string;
  payload?: Record<string, unknown>;
};

export default function AdminInstructorDetailPage() {
  const params = useParams<{ id: string }>();
  const instructorId = params.id ?? "";

  const [detail, setDetail] = useState<AdminInstructorDetail | null>(null);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [students, setStudents] = useState<AdminInstructorStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [coursePage, setCoursePage] = useState(1);
  const [coursePageSize, setCoursePageSize] = useState(20);
  const [courseTotal, setCourseTotal] = useState(0);
  const [courseTotalPages, setCourseTotalPages] = useState(1);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseStatus, setCourseStatus] = useState<"ALL" | "published" | "unpublished" | "archived">("ALL");

  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(20);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [studentSearch, setStudentSearch] = useState("");

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const courseFilters = [
    ...(courseSearch.trim() ? [{ key: "search", label: "Search", value: courseSearch.trim(), onRemove: () => setCourseSearch("") }] : []),
    ...(courseStatus !== "ALL" ? [{ key: "status", label: "Status", value: courseStatus, onRemove: () => setCourseStatus("ALL") }] : []),
  ];
  const studentFilters = [
    ...(studentSearch.trim() ? [{ key: "search", label: "Search", value: studentSearch.trim(), onRemove: () => setStudentSearch("") }] : []),
  ];

  const loadSummary = useCallback(async () => {
    if (!instructorId) return;
    const result = await getAdminInstructor(instructorId);
    setDetail(result);
  }, [instructorId]);

  const loadCourses = useCallback(async () => {
    if (!instructorId) return;
    const paramsValue = new URLSearchParams();
    paramsValue.set("page", String(coursePage));
    paramsValue.set("pageSize", String(coursePageSize));
    if (courseSearch.trim()) paramsValue.set("search", courseSearch.trim());
    if (courseStatus !== "ALL") paramsValue.set("status", courseStatus);
    const result = await listAdminInstructorCourses(instructorId, paramsValue);
    setCourses(result.courses);
    setCourseTotal(result.total);
    setCourseTotalPages(result.totalPages);
  }, [coursePage, coursePageSize, courseSearch, courseStatus, instructorId]);

  const loadStudents = useCallback(async () => {
    if (!instructorId) return;
    const paramsValue = new URLSearchParams();
    paramsValue.set("page", String(studentPage));
    paramsValue.set("pageSize", String(studentPageSize));
    if (studentSearch.trim()) paramsValue.set("search", studentSearch.trim());
    const result = await listAdminInstructorStudents(instructorId, paramsValue);
    setStudents(result.students);
    setStudentTotal(result.total);
    setStudentTotalPages(result.totalPages);
  }, [instructorId, studentPage, studentPageSize, studentSearch]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadSummary(), loadCourses(), loadStudents()]);
  }, [loadCourses, loadStudents, loadSummary]);

  useEffect(() => {
    setLoading(true);
    refreshAll()
      .then(() => setError(null))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load instructor detail"))
      .finally(() => setLoading(false));
  }, [refreshAll]);

  useEffect(() => {
    setCoursePage(1);
  }, [courseSearch, courseStatus, coursePageSize]);

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, studentPageSize]);

  const executeAction = async (reason: string) => {
    if (!pendingAction) return;

    setActionBusy(true);
    try {
      await apiFetch(pendingAction.endpoint, {
        method: pendingAction.method,
        body: JSON.stringify({ ...(pendingAction.payload ?? {}), reason }),
      });

      await refreshAll();
      setPendingAction(null);
      setToast({ message: "Action completed.", tone: "success" });
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

      <GlassCard
        title={detail?.instructor.fullName?.trim() || detail?.instructor.email || "Instructor"}
        subtitle={detail ? detail.instructor.email : "Loading..."}
        actions={<Link to="/admin/instructors" className="text-sm text-[var(--accent)] hover:underline">Back to instructors</Link>}
      >
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : detail ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/35 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Instructor Profile</p>
              <div className="mt-3 grid gap-2 text-sm text-[var(--text-muted)]">
                <p>
                  <span className="text-[var(--text)]">Status:</span> {detail.instructor.suspendedAt ? "Suspended" : "Active"}
                </p>
                <p>
                  <span className="text-[var(--text)]">Email:</span> {detail.instructor.email}
                </p>
                <p>
                  <span className="text-[var(--text)]">Created:</span> {new Date(detail.instructor.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Courses" value={detail.counts.totalCourses} />
              <StatCard label="Published" value={detail.counts.publishedCourses} />
              <StatCard label="Archived" value={detail.counts.archivedCourses} />
              <StatCard label="Students" value={detail.counts.totalStudents} />
            </div>
          </div>
        ) : null}

        {detail && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-3 py-0 text-xs"
              onClick={() =>
                setPendingAction({
                  endpoint: `/admin/users/${detail.instructor.id}/${detail.instructor.suspendedAt ? "activate" : "suspend"}`,
                  method: "PATCH",
                  title: detail.instructor.suspendedAt ? "Activate instructor" : "Suspend instructor",
                  description: "This moderation action affects instructor access and is audit logged.",
                  confirmLabel: detail.instructor.suspendedAt ? "Activate" : "Suspend",
                })
              }
            >
              {detail.instructor.suspendedAt ? "Activate" : "Suspend"} instructor
            </Button>
          </div>
        )}
      </GlassCard>

      <GlassCard title="Instructor Courses" subtitle="Published, unpublished, and archived courses.">
        <AdminFilterBar
          title="Course Filters"
          helper="Inspect instructor-owned courses by search and lifecycle."
          activeFilterCount={courseFilters.length}
          hint="Filter owned courses by title and publish/archive state."
          onReset={() => {
            setCourseSearch("");
            setCourseStatus("ALL");
          }}
          rightSlot={
            <Button type="button" className="h-9 px-3 py-0 text-xs" onClick={() => void loadCourses()}>
              Refresh
            </Button>
          }
        >
          <input
            value={courseSearch}
            onChange={(event) => setCourseSearch(event.target.value)}
            placeholder="Search courses"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <Select
            value={courseStatus}
            onChange={(next) => setCourseStatus(next as typeof courseStatus)}
            ariaLabel="Filter instructor courses by status"
            items={[
              { label: "All statuses", value: "ALL" },
              { label: "Published", value: "published" },
              { label: "Unpublished", value: "unpublished" },
              { label: "Archived", value: "archived" },
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
          appliedFilters={courseFilters}
          onClearFilters={() => {
            setCourseSearch("");
            setCourseStatus("ALL");
          }}
          hasRows={courses.length > 0}
          emptyMessage="No courses found."
          colCount={5}
        >
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Lessons</th>
              <th className="px-3 py-2">Enrollments</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2">{course.title}</td>
                <td className="px-3 py-2">{course.archivedAt ? "Archived" : course.isPublished ? "Published" : "Unpublished"}</td>
                <td className="px-3 py-2">{course._count.lessons}</td>
                <td className="px-3 py-2">{course._count.enrollments}</td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-2.5 py-0 text-xs"
                    onClick={() =>
                      setPendingAction({
                        endpoint: `/admin/courses/${course.id}/archive`,
                        method: "PATCH",
                        title: "Archive course",
                        description: "Force archive this instructor course.",
                        confirmLabel: "Archive",
                      })
                    }
                  >
                    Archive
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>

        <AdminPagination
          page={coursePage}
          pageSize={coursePageSize}
          total={courseTotal}
          totalPages={courseTotalPages}
          onPageChange={setCoursePage}
          onPageSizeChange={setCoursePageSize}
        />
      </GlassCard>

      <GlassCard title="Students" subtitle="Unique students with active enrollments in instructor courses.">
        <AdminFilterBar
          title="Student Filters"
          helper="Find enrolled students for this instructor."
          activeFilterCount={studentFilters.length}
          hint="Search active students by name or email."
          onReset={() => setStudentSearch("")}
          rightSlot={
            <Button type="button" className="h-9 px-3 py-0 text-xs" onClick={() => void loadStudents()}>
              Refresh
            </Button>
          }
        >
          <input
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="Search students"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <div />
          <div />
          <div />
        </AdminFilterBar>

        <AdminTable
          loading={loading}
          error={error}
          stickyHeader
          zebraRows
          appliedFilters={studentFilters}
          onClearFilters={() => setStudentSearch("")}
          hasRows={students.length > 0}
          emptyMessage="No students found."
          colCount={4}
        >
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">First Enrolled</th>
              <th className="px-3 py-2">Active Courses</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2">{student.fullName?.trim() || "Unnamed"}</td>
                <td className="px-3 py-2">{student.email}</td>
                <td className="px-3 py-2">{new Date(student.firstEnrolledAt).toLocaleString()}</td>
                <td className="px-3 py-2">{student.activeCourses}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>

        <AdminPagination
          page={studentPage}
          pageSize={studentPageSize}
          total={studentTotal}
          totalPages={studentTotalPages}
          onPageChange={setStudentPage}
          onPageSizeChange={setStudentPageSize}
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

