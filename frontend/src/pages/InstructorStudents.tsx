import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
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
    <Card title="Enrolled Students" subtitle="Roster and progress summary for this course." className="w-full">
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
        <div className="grid gap-3">
          {students.map((student) => (
            <div
              key={student.userId}
              className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4"
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
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
