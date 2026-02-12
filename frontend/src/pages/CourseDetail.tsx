import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAuth } from "../context/auth";
import { apiFetch } from "../lib/api";

type Course = {
  id: string;
  title: string;
  description: string | null;
};

type Lesson = {
  id: string;
  title: string;
  completed?: boolean;
};

export default function CourseDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || user?.role === "INSTRUCTOR" || user?.role === "ADMIN") return;
    setLoading(true);
    Promise.all([
      apiFetch<{ course: Course }>(`/courses/${id}`),
      apiFetch<{ lessons: Lesson[] }>(`/courses/${id}/lessons`),
    ])
      .then(([courseResult, lessonsResult]) => {
        setCourse(courseResult.course);
        setLessons(lessonsResult.lessons ?? []);
        setError(null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load course";
        if (message === "Forbidden" || message === "Access requires approved enrollment") {
          setError("Access blocked. Open this course from My Courses after enrollment is approved.");
          return;
        }
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [id, user?.role]);

  if (user?.role === "INSTRUCTOR" || user?.role === "ADMIN") {
    return (
      <Card title="Course View" subtitle="This page is student-only." className="w-full">
        <div className="grid gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            Open courses from Instructor workspace to edit lessons, publish state, and requests.
          </p>
          <div>
            <Button type="button" variant="ghost" onClick={() => navigate(id ? `/instructor/courses/${id}` : "/instructor")}>
              Go to Instructor workspace
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title={course?.title ?? "Course"} subtitle={course?.description ?? ""} className="w-full">
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      ) : error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : (
        <div className="grid gap-4">
          {lessons.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No lessons available yet.</p>
          ) : (
            lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--text)]">{lesson.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {lesson.completed ? "Completed" : "Not completed"}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => navigate(`/lessons/${lesson.id}`)}>
                    Open lesson
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}
