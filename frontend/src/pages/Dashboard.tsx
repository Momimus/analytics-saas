import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/auth";

type ProgressSummary = {
  totalEnrolledCourses: number;
  totalLessonsCompleted: number;
};

type InstructorCourse = {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  updatedAt: string;
  lessonsCount: number;
  enrollmentsCount: number;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [instructorCourses, setInstructorCourses] = useState<InstructorCourse[]>([]);
  const [instructorLoading, setInstructorLoading] = useState(false);
  const [instructorError, setInstructorError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "STUDENT") {
      setSummary(null);
      setProgressError(null);
      setProgressLoading(false);
      return;
    }

    setProgressLoading(true);
    apiFetch<ProgressSummary>("/my/progress")
      .then((data) => {
        setSummary(data);
        setProgressError(null);
      })
      .catch((err) => {
        setProgressError(err instanceof Error ? err.message : "Failed to load progress");
      })
      .finally(() => setProgressLoading(false));
  }, [user]);

  const isStudent = user?.role === "STUDENT";
  const isInstructorRole = user?.role === "INSTRUCTOR" || user?.role === "ADMIN";

  useEffect(() => {
    if (!isInstructorRole) {
      setInstructorCourses([]);
      setInstructorError(null);
      setInstructorLoading(false);
      return;
    }

    setInstructorLoading(true);
    apiFetch<{ courses: InstructorCourse[] }>("/instructor/courses")
      .then((result) => {
        setInstructorCourses(result.courses);
        setInstructorError(null);
      })
      .catch((err) => {
        setInstructorError(err instanceof Error ? err.message : "Failed to load instructor data");
      })
      .finally(() => setInstructorLoading(false));
  }, [isInstructorRole]);

  const instructorStats = useMemo(() => {
    const totalCourses = instructorCourses.length;
    const publishedCourses = instructorCourses.filter((course) => course.isPublished).length;
    const draftCourses = totalCourses - publishedCourses;
    const totalEnrollments = instructorCourses.reduce((sum, course) => sum + course.enrollmentsCount, 0);

    return { totalCourses, publishedCourses, draftCourses, totalEnrollments };
  }, [instructorCourses]);

  const recentCourses = useMemo(() => instructorCourses.slice(0, 3), [instructorCourses]);

  return (
    <div className="grid gap-6">
      <div className="rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)]/80 p-6 shadow-[var(--shadow-card)]">
        <p className="text-3xl font-semibold tracking-tight text-[var(--text)]">
          {user?.fullName ? `Welcome, ${user.fullName}` : "Welcome"}
        </p>
        <div className="mt-3 text-sm text-[var(--text-muted)]">
          {user ? (
            <div className="grid gap-1">
              <p>Logged in as: {user.email}</p>
              <p>Role: {user.role}</p>
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>

      {isStudent ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Enrolled courses</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {summary ? summary.totalEnrolledCourses : "--"}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Lessons completed</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {summary ? summary.totalLessonsCompleted : "--"}
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
            <p className="text-[var(--text)]">My Progress</p>
            {summary ? (
              <div className="mt-2 grid gap-1 text-sm text-[var(--text-muted)]">
                <p>Enrolled courses: {summary.totalEnrolledCourses}</p>
                <p>Lessons completed: {summary.totalLessonsCompleted}</p>
              </div>
            ) : progressError ? (
              <p className="mt-2 text-sm text-rose-300">{progressError}</p>
            ) : progressLoading ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">Loading...</p>
            ) : (
              <p className="mt-2 text-sm text-[var(--text-muted)]">No progress data yet.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => navigate("/courses")}>
              View courses
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/my-courses")}>
              My courses
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/profile")}>
              Open profile
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Total Courses</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {instructorLoading ? "--" : instructorStats.totalCourses}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Published</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {instructorLoading ? "--" : instructorStats.publishedCourses}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Drafts</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {instructorLoading ? "--" : instructorStats.draftCourses}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Enrollments</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {instructorLoading ? "--" : instructorStats.totalEnrollments}
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
            <p className="text-[var(--text)]">Recent courses</p>
            {instructorLoading ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">Loading...</p>
            ) : instructorError ? (
              <p className="mt-2 text-sm text-rose-300">{instructorError}</p>
            ) : recentCourses.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">No courses yet.</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {recentCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/60 px-3 py-2"
                  >
                    <div className="grid gap-1">
                      <p className="text-sm font-semibold text-[var(--text)]">{course.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {course.isPublished ? "Published" : "Draft"} • Updated {new Date(course.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" onClick={() => navigate(`/instructor/courses/${course.id}`)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate(`/instructor/courses/${course.id}/students`)}
                      >
                        Students
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => navigate("/instructor/new")}>
              Create course
            </Button>
            <Button type="button" onClick={() => navigate("/instructor")}>
              Go to Instructor workspace
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/courses")}>
              View catalog
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/profile")}>
              Open profile
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
