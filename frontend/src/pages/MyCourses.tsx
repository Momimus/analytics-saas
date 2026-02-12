import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAuth } from "../context/auth";
import { apiFetch } from "../lib/api";
import { formatInstructorName } from "../lib/instructor";

type Course = {
  id: string;
  title: string;
  description: string | null;
  lessonsCount?: number;
  createdBy?: {
    fullName?: string | null;
    email?: string | null;
  };
};

type ProgressSummary = {
  perCourse: Array<{
    courseId: string;
    completedLessons: number;
    totalLessons: number;
  }>;
};

export default function MyCoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressByCourse, setProgressByCourse] = useState<Record<string, { completed: number; total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "STUDENT") {
      setCourses([]);
      setProgressByCourse({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    Promise.all([apiFetch<{ courses: Course[] }>("/my/courses"), apiFetch<ProgressSummary>("/my/progress")])
      .then(([courseData, progressData]) => {
        setCourses(courseData.courses);
        const next: Record<string, { completed: number; total: number }> = {};
        for (const item of progressData.perCourse ?? []) {
          next[item.courseId] = { completed: item.completedLessons, total: item.totalLessons };
        }
        setProgressByCourse(next);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load courses"))
      .finally(() => setLoading(false));
  }, [user?.role]);

  if (user?.role !== "STUDENT") {
    return (
      <Card title="My Courses" subtitle="Courses you are enrolled in." className="w-full">
        <div className="grid gap-3">
          <p className="text-sm text-[var(--text-muted)]">This section is available to students only.</p>
          <div>
            <Button type="button" variant="ghost" onClick={() => navigate("/courses")}>
              View courses
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="My Courses" subtitle="Courses you are enrolled in." className="w-full">
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      ) : error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">You are not enrolled in any courses yet.</p>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <div key={course.id} className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4">
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-semibold text-[var(--text)]">{course.title}</p>
                  {(() => {
                    const item = progressByCourse[course.id];
                    const total = item?.total ?? course.lessonsCount ?? 0;
                    const completed = item?.completed ?? 0;
                    const isCompleted = total > 0 && completed >= total;
                    return (
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          isCompleted
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {isCompleted ? "Completed" : "Incomplete"}
                      </span>
                    );
                  })()}
                </div>
                {course.description && (
                  <p className="text-sm text-[var(--text-muted)]">{course.description}</p>
                )}
                <p className="text-xs text-[var(--text-muted)]">Instructor: {formatInstructorName(course.createdBy)}</p>
                <p className="text-xs text-[var(--text-muted)]">Lessons: {course.lessonsCount ?? 0}</p>
                <div className="grid gap-1">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Progress</span>
                    <span>
                      {(() => {
                        const item = progressByCourse[course.id];
                        const total = item?.total ?? course.lessonsCount ?? 0;
                        const completed = item?.completed ?? 0;
                        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return `${percent}% (${completed}/${total})`;
                      })()}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                      style={{
                        width: `${(() => {
                          const item = progressByCourse[course.id];
                          const total = item?.total ?? course.lessonsCount ?? 0;
                          const completed = item?.completed ?? 0;
                          return total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0;
                        })()}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" variant="ghost" onClick={() => navigate(`/courses/${course.id}`)}>
                  Open
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
