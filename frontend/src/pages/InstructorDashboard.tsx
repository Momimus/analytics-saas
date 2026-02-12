import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import CourseThumbnail from "../components/CourseThumbnail";
import { apiFetch } from "../lib/api";

type InstructorCourse = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  updatedAt: string;
  lessonsCount: number;
  enrollmentsCount: number;
};

export default function InstructorDashboardPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingCourseId, setRequestingCourseId] = useState<string | null>(null);
  const [courseToRequestDelete, setCourseToRequestDelete] = useState<InstructorCourse | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    const result = await apiFetch<{ courses: InstructorCourse[] }>("/instructor/courses");
    setCourses(result.courses);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadCourses()
      .then(() => {
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load instructor courses");
      })
      .finally(() => setLoading(false));
  }, [loadCourses]);

  const overview = useMemo(() => {
    const totalCourses = courses.length;
    const publishedCourses = courses.filter((course) => course.isPublished).length;
    const draftCourses = totalCourses - publishedCourses;
    const totalEnrollments = courses.reduce((sum, course) => sum + course.enrollmentsCount, 0);
    const totalLessons = courses.reduce((sum, course) => sum + course.lessonsCount, 0);

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrollments,
      totalLessons,
    };
  }, [courses]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Instructor Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage your draft and published courses.</p>
        </div>
        <Button type="button" onClick={() => navigate("/instructor/new")}>Create Course</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Total Courses</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{overview.totalCourses}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Published</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{overview.publishedCourses}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Drafts</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{overview.draftCourses}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Enrollments</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{overview.totalEnrollments}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Lessons</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{overview.totalLessons}</p>
        </div>
      </div>

      <Card title="My Courses" subtitle="Status, lesson count, and enrollments." className="w-full">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No courses yet. Create your first draft.</p>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => {
              const isRequesting = requestingCourseId === course.id;
              const anyRequestInFlight = requestingCourseId !== null;
              return (
                <div
                  key={course.id}
                  className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                      <CourseThumbnail title={course.title} imageUrl={course.imageUrl} className="h-24 w-full sm:w-[140px]" />
                      <div className="grid gap-1">
                        <p className="text-base font-semibold text-[var(--text)]">{course.title}</p>
                        {course.description && <p className="text-sm text-[var(--text-muted)]">{course.description}</p>}
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                          <span
                            className={`rounded-full px-2 py-1 ${
                              course.isPublished
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {course.isPublished ? "Published" : "Draft"}
                          </span>
                          <span>Lessons: {course.lessonsCount}</span>
                          <span>Enrollments: {course.enrollmentsCount}</span>
                          <span>Updated: {new Date(course.updatedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={anyRequestInFlight}
                        onClick={() => navigate(`/instructor/courses/${course.id}`)}
                      >
                        Edit
                      </Button>
                      <Link
                        to={`/instructor/courses/${course.id}/students`}
                        className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[color:var(--surface)] hover:text-[var(--text)]"
                      >
                        Students
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={anyRequestInFlight}
                        onClick={() => {
                          setNotice(null);
                          setError(null);
                          setDeleteReason("");
                          setCourseToRequestDelete(course);
                        }}
                      >
                        Request Deletion
                      </Button>
                      {isRequesting && <span className="self-center text-xs text-[var(--text-muted)]">Sending...</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {notice && <p className="mt-3 text-sm text-emerald-300">{notice}</p>}
      </Card>

      {courseToRequestDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold text-[var(--text)]">Request course deletion?</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Submit a deletion request for <span className="text-[var(--text)]">{courseToRequestDelete.title}</span>. An admin must approve it.
            </p>
            <label className="mt-3 grid gap-2 text-sm font-medium text-[var(--text-muted)]">
              <span className="text-[var(--text)]">Reason (required)</span>
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                className="min-h-[96px] w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                placeholder="Explain why this course should be archived"
              />
            </label>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={requestingCourseId !== null}
                onClick={() => setCourseToRequestDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={requestingCourseId !== null || !deleteReason.trim()}
                onClick={async () => {
                  setRequestingCourseId(courseToRequestDelete.id);
                  setError(null);
                  setNotice(null);
                  try {
                    await apiFetch<{ ok: true }>(`/instructor/courses/${courseToRequestDelete.id}/delete-request`, {
                      method: "POST",
                      body: JSON.stringify({ reason: deleteReason.trim() }),
                    });
                    setCourseToRequestDelete(null);
                    setNotice("Deletion request submitted for admin approval.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to submit deletion request");
                  } finally {
                    setRequestingCourseId(null);
                  }
                }}
              >
                {requestingCourseId ? "Sending..." : "Submit Request"}
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
