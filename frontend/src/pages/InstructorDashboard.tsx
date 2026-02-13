import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import CourseThumbnail from "../components/CourseThumbnail";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import GlassCard from "../components/ui/GlassCard";
import { apiFetch } from "../lib/api";
import { formatInstructorName } from "../lib/instructor";

type InstructorCourse = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  updatedAt: string;
  lessonsCount: number;
  enrollmentsCount: number;
  createdBy?: {
    fullName?: string | null;
    email?: string | null;
  };
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
        <StatCard label="Total Courses" value={overview.totalCourses} />
        <StatCard label="Published" value={overview.publishedCourses} />
        <StatCard label="Drafts" value={overview.draftCourses} />
        <StatCard label="Enrollments" value={overview.totalEnrollments} />
        <StatCard label="Lessons" value={overview.totalLessons} />
      </div>

      <GlassCard title="My Courses" subtitle="Status, lesson count, and enrollments." className="w-full">
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
                <GlassCard key={course.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                      <CourseThumbnail title={course.title} imageUrl={course.imageUrl} className="w-32 sm:w-36" />
                      <div className="grid gap-1">
                        <p className="text-base font-semibold text-[var(--text)]">{course.title}</p>
                        {course.description && <p className="text-sm text-[var(--text-muted)]">{course.description}</p>}
                        <p className="text-xs text-[var(--text-muted)]">Instructor: {formatInstructorName(course.createdBy)}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                          <Badge tone={course.isPublished ? "success" : "neutral"}>
                            {course.isPublished ? "Published" : "Draft"}
                          </Badge>
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
                </GlassCard>
              );
            })}
          </div>
        )}
        {notice && <p className="mt-3 text-sm text-emerald-300">{notice}</p>}
      </GlassCard>

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
