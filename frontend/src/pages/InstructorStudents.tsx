import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import StatCard from "../components/ui/StatCard";
import { apiFetch } from "../lib/api";

type StudentRow = {
  userId: string;
  name: string | null;
  email: string;
  enrolledAt: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
};

export default function InstructorStudentsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const overview = useMemo(() => {
    const totalStudents = students.length;
    const avgProgress = totalStudents
      ? Math.round(students.reduce((sum, student) => sum + student.progressPercent, 0) / totalStudents)
      : 0;
    const totalCompleted = students.reduce((sum, student) => sum + student.completedLessons, 0);
    const totalLessons = students.reduce((sum, student) => sum + student.totalLessons, 0);
    return { totalStudents, avgProgress, totalCompleted, totalLessons };
  }, [students]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<{ students: StudentRow[] }>(`/instructor/courses/${id}/students`)
      .then((result) => {
        setStudents(result.students);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load students"))
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) {
    return <p className="text-sm text-rose-300">Course id is required.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard loading={loading} label="Students" value={overview.totalStudents} hint="Currently enrolled" />
        <StatCard loading={loading} label="Avg Progress" value={`${overview.avgProgress}%`} hint="Across all students" />
        <StatCard loading={loading} label="Completed Lessons" value={`${overview.totalCompleted}/${overview.totalLessons}`} hint="Aggregate completion" />
      </div>
      <GlassCard title="Enrolled Students" subtitle="Roster and progress summary for this course." className="w-full">
        <div className="mb-4">
        <Button type="button" variant="ghost" onClick={() => navigate(`/instructor/courses/${id}`)}>
          Back to course editor
        </Button>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No enrolled students yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {students.map((student) => (
              <div
                key={student.userId}
                className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-3 sm:p-4"
              >
                <div className="grid gap-1">
                  <p className="text-sm font-semibold text-[var(--text)]">{student.name ?? "Unnamed Student"}</p>
                  <p className="text-sm text-[var(--text-muted)]">{student.email}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                    <span>Enrolled: {new Date(student.enrolledAt).toLocaleString()}</span>
                    <span>
                      Progress: {student.progressPercent}% ({student.completedLessons}/{student.totalLessons})
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--surface)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, student.progressPercent))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
