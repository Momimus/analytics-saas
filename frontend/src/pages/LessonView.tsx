import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAuth } from "../context/auth";
import { apiFetch } from "../lib/api";

type Lesson = {
  id: string;
  title: string;
  videoUrl?: string | null;
  pdfUrl?: string | null;
  completed: boolean;
};

export default function LessonViewPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadLesson = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ lesson: Lesson }>(`/lessons/${id}`);
      setLesson(data.lesson);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id || user?.role !== "STUDENT") {
      setLesson(null);
      setLoading(false);
      return;
    }

    void loadLesson();
  }, [id, user?.role]);

  const handleComplete = async () => {
    if (!id || !lesson) return;
    const previous = lesson;
    setError(null);
    setNotice(null);
    setLesson({ ...lesson, completed: true });
    setSaving(true);
    try {
      await apiFetch(`/lessons/${id}/complete`, { method: "POST" });
      await loadLesson();
      setNotice("Lesson marked as completed.");
    } catch (err) {
      setLesson(previous);
      setError(err instanceof Error ? err.message : "Failed to mark complete");
    } finally {
      setSaving(false);
    }
  };

  const handleUncomplete = async () => {
    if (!id || !lesson) return;
    const previous = lesson;
    setError(null);
    setNotice(null);
    setLesson({ ...lesson, completed: false });
    setSaving(true);
    try {
      await apiFetch(`/lessons/${id}/uncomplete`, { method: "POST" });
      await loadLesson();
      setNotice("Lesson marked as incomplete.");
    } catch (err) {
      setLesson(previous);
      setError(err instanceof Error ? err.message : "Failed to mark incomplete");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={lesson?.title ?? "Lesson"} subtitle="Lesson details" className="w-full">
      {user?.role !== "STUDENT" ? (
        <p className="text-sm text-[var(--text-muted)]">Lesson progress is available to students only.</p>
      ) : loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      ) : error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : lesson ? (
        <div className="grid gap-4 text-sm text-[var(--text-muted)]">
          <p className="text-[var(--text)]">Status: {lesson.completed ? "Completed" : "Not completed"}</p>
          {notice && <p className="text-sm text-emerald-300">{notice}</p>}
          <div className="grid gap-2">
            {lesson.videoUrl && (
              <a
                href={lesson.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--accent)]"
              >
                Open video
              </a>
            )}
            {lesson.pdfUrl && (
              <a
                href={lesson.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--accent)]"
              >
                Open PDF
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={saving || lesson.completed} onClick={handleComplete}>
              {saving ? "Saving..." : "Mark completed"}
            </Button>
            <Button type="button" variant="ghost" disabled={saving || !lesson.completed} onClick={handleUncomplete}>
              Mark incomplete
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
