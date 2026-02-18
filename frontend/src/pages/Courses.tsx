import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import InlineErrorState from "../components/common/InlineErrorState";
import CourseThumbnail from "../components/CourseThumbnail";
import GlassCard from "../components/ui/GlassCard";
import SelectPopover from "../components/ui/SelectPopover";
import { useAuth } from "../context/auth";
import { apiFetch, ApiError } from "../lib/api";
import { formatInstructorName } from "../lib/instructor";

type Course = {
  id: string;
  title: string;
  description: string | null;
  imageUrl?: string | null;
  lessonsCount?: number;
  createdBy?: {
    fullName?: string | null;
    email?: string | null;
  };
};

type EnrollmentStatus = "REQUESTED" | "ACTIVE" | "REVOKED";

export default function CoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollmentByCourseId, setEnrollmentByCourseId] = useState<Record<string, EnrollmentStatus>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ENROLLED" | "NOT_ENROLLED">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [reloadTick, setReloadTick] = useState(0);

  const filterOptions: Array<{ value: "ALL" | "ENROLLED" | "NOT_ENROLLED"; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "ENROLLED", label: "Enrolled" },
    { value: "NOT_ENROLLED", label: "Not Enrolled" },
  ];

  const isStudent = user?.role === "STUDENT";
  const isInstructorRole = user?.role === "INSTRUCTOR" || user?.role === "ADMIN";

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<{ courses: Course[] }>("/courses")
      .then(async (allCoursesResult) => {
        if (!active) return;
        let nextEnrollmentByCourseId: Record<string, EnrollmentStatus> = {};
        if (isStudent) {
          const enrollmentsResult = await apiFetch<{
            enrollments: Array<{ courseId: string; status: EnrollmentStatus }>;
          }>("/my/enrollments");
          nextEnrollmentByCourseId = Object.fromEntries(
            enrollmentsResult.enrollments.map((item) => [item.courseId, item.status])
          );
        }

        if (!active) return;
        setCourses(allCoursesResult.courses);
        setEnrollmentByCourseId(nextEnrollmentByCourseId);
        setError(null);
        setErrorStatusCode(undefined);
        setErrorDetails(undefined);
      })
      .catch((err) => {
        if (!active) return;
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
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isStudent, reloadTick]);

  const handleRequestAccess = async (courseId: string) => {
    if (!isStudent) return;
    try {
      const result = await apiFetch<{ enrollment: { status: EnrollmentStatus } }>(
        "/courses/" + courseId + "/request-access",
        { method: "POST" }
      );
      setEnrollmentByCourseId((prev) => ({ ...prev, [courseId]: result.enrollment.status }));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorStatusCode(err.status);
        setErrorDetails(err.code);
      } else {
        setError(err instanceof Error ? err.message : "Failed to request access");
        setErrorStatusCode(undefined);
        setErrorDetails(undefined);
      }
    }
  };

  const visibleCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return courses.filter((course) => {
      const text = `${course.title} ${course.description ?? ""}`.toLowerCase();
      const matchesSearch = term.length === 0 || text.includes(term);
      const enrollmentStatus = enrollmentByCourseId[course.id];
      const enrolled = enrollmentStatus === "ACTIVE";
      const matchesFilter =
        filter === "ALL" ||
        (filter === "ENROLLED" && enrolled) ||
        (filter === "NOT_ENROLLED" && !enrolled);
      return matchesSearch && matchesFilter;
    });
  }, [courses, enrollmentByCourseId, search, filter]);

  return (
    <GlassCard title="Courses" subtitle="Browse all available courses." className="w-full">
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      ) : error ? (
        <InlineErrorState
          title="Unable to load courses"
          message={error}
          statusCode={errorStatusCode}
          details={errorDetails}
          onRetry={() => setReloadTick((value) => value + 1)}
        />
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/60 p-2.5 sm:grid-cols-[1fr_auto]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses by title or description"
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/70 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <SelectPopover
              items={filterOptions}
              value={filter}
              onChange={(value) => setFilter(value as "ALL" | "ENROLLED" | "NOT_ENROLLED")}
              className="w-full sm:w-52"
            />
          </div>
          {visibleCourses.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No courses match your current search/filter.</p>
          )}
          {visibleCourses.map((course) => {
            const enrollmentStatus = enrollmentByCourseId[course.id];
            const canOpen = isStudent && enrollmentStatus === "ACTIVE";
            return (
              <div
                key={course.id}
                className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-3.5"
              >
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <CourseThumbnail title={course.title} imageUrl={course.imageUrl} className="w-32 sm:w-36" />
                  <div className="grid gap-1">
                    <p className="text-base font-semibold text-[var(--text)]">{course.title}</p>
                    {course.description && (
                      <p className="text-sm text-[var(--text-muted)]">{course.description}</p>
                    )}
                    <p className="text-xs text-[var(--text-muted)]">Instructor: {formatInstructorName(course.createdBy)}</p>
                    <p className="text-xs text-[var(--text-muted)]">Lessons: {course.lessonsCount ?? 0}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {isStudent && (
                    <>
                      <Button type="button" variant="ghost" disabled={!canOpen} onClick={() => navigate(`/courses/${course.id}`)}>
                        Open
                      </Button>
                      <Button
                        type="button"
                        disabled={enrollmentStatus === "REQUESTED" || enrollmentStatus === "ACTIVE"}
                        onClick={() => handleRequestAccess(course.id)}
                      >
                        {enrollmentStatus === "ACTIVE"
                          ? "Access Granted"
                          : enrollmentStatus === "REQUESTED"
                            ? "Request Pending"
                            : "Request Access"}
                      </Button>
                      {!canOpen && (
                        <p className="self-center text-xs text-[var(--text-muted)]">
                          Open unlocks after instructor approval.
                        </p>
                      )}
                    </>
                  )}
                  {isInstructorRole && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate(`/instructor/courses/${course.id}`)}
                      >
                        Manage
                      </Button>
                      <p className="self-center text-xs text-[var(--text-muted)]">
                        Manage courses from the instructor workspace.
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
