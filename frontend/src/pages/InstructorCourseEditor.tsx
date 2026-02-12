import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { apiFetch } from "../lib/api";
import { isDirectImageUrl } from "../lib/media";

type Course = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  updatedAt: string;
  lessonsCount: number;
  enrollmentsCount: number;
};

type Lesson = {
  id: string;
  title: string;
  videoUrl: string | null;
  pdfUrl: string | null;
  createdAt: string;
};

type LessonDraft = {
  title: string;
  videoUrl: string;
  pdfUrl: string;
};

type AccessRequest = {
  id: string;
  status: "REQUESTED";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
};

export default function InstructorCourseEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "",
    level: "",
    imageUrl: "",
  });
  const [newLesson, setNewLesson] = useState<LessonDraft>({ title: "", videoUrl: "", pdfUrl: "" });
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonDraft>({ title: "", videoUrl: "", pdfUrl: "" });
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);

  const refreshLessons = useCallback(async () => {
    if (!id) return;
    const lessonResult = await apiFetch<{ lessons: Lesson[] }>(`/instructor/courses/${id}/lessons`);
    setLessons(lessonResult.lessons);
  }, [id]);

  const refreshRequests = useCallback(async () => {
    if (!id) return;
    const result = await apiFetch<{ requests: AccessRequest[] }>(`/instructor/courses/${id}/requests`);
    setRequests(result.requests);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiFetch<{ course: Course }>(`/instructor/courses/${id}`),
      apiFetch<{ lessons: Lesson[] }>(`/instructor/courses/${id}/lessons`),
      apiFetch<{ requests: AccessRequest[] }>(`/instructor/courses/${id}/requests`),
    ])
      .then(([courseResult, lessonResult, requestsResult]) => {
        setCourse(courseResult.course);
        setLessons(lessonResult.lessons);
        setRequests(requestsResult.requests);
        setDraft({
          title: courseResult.course.title ?? "",
          description: courseResult.course.description ?? "",
          category: courseResult.course.category ?? "",
          level: courseResult.course.level ?? "",
          imageUrl: courseResult.course.imageUrl ?? "",
        });
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load course editor"))
      .finally(() => setLoading(false));
  }, [id]);

  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons]
  );

  if (!id) {
    return <p className="text-sm text-rose-300">Course id is required.</p>;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Course Editor</h1>
          <p className="text-sm text-[var(--text-muted)]">Edit details, manage lessons, and publish when ready.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/instructor/courses/${id}/students`}
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[color:var(--surface)] hover:text-[var(--text)]"
          >
            View Students
          </Link>
          <Button type="button" variant="ghost" onClick={() => navigate("/instructor")}>
            Back
          </Button>
        </div>
      </div>

      <Card title={course?.title ?? "Course"} subtitle={course ? `Updated ${new Date(course.updatedAt).toLocaleString()}` : ""} className="w-full">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-full px-2 py-1 ${
                  course?.isPublished ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {course?.isPublished ? "Published" : "Draft"}
              </span>
              <span className="text-[var(--text-muted)]">Lessons: {course?.lessonsCount ?? lessons.length}</span>
              <span className="text-[var(--text-muted)]">Enrollments: {course?.enrollmentsCount ?? 0}</span>
            </div>
            <form
              className="grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (savingCourse) return;
                setSavingCourse(true);
                setNotice(null);
                setError(null);
                try {
                  if (draft.imageUrl.trim() && !isDirectImageUrl(draft.imageUrl)) {
                    throw new Error("Image URL must be a direct link to jpg, png, webp, or gif");
                  }
                  const result = await apiFetch<{ course: Course }>(`/instructor/courses/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      title: draft.title,
                      description: draft.description,
                      category: draft.category,
                      level: draft.level,
                      imageUrl: draft.imageUrl,
                    }),
                  });
                  setCourse(result.course);
                  setNotice("Course updated.");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to update course");
                } finally {
                  setSavingCourse(false);
                }
              }}
            >
              <Input
                type="text"
                name="title"
                label="Title"
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
              <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
                <span className="text-[var(--text)]">Description</span>
                <textarea
                  className="min-h-[100px] w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  type="text"
                  name="category"
                  label="Category"
                  value={draft.category}
                  onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
                />
                <Input
                  type="text"
                  name="level"
                  label="Level"
                  value={draft.level}
                  onChange={(event) => setDraft((prev) => ({ ...prev, level: event.target.value }))}
                />
              </div>
              <Input
                type="url"
                name="imageUrl"
                label="Image URL"
                value={draft.imageUrl}
                onChange={(event) => setDraft((prev) => ({ ...prev, imageUrl: event.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={savingCourse}>
                  {savingCourse ? "Saving..." : "Save course"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={savingCourse}
                  onClick={async () => {
                    setSavingCourse(true);
                    setNotice(null);
                    setError(null);
                    try {
                      const path = course?.isPublished
                        ? `/instructor/courses/${id}/unpublish`
                        : `/instructor/courses/${id}/publish`;
                      const result = await apiFetch<{ course: Course }>(path, { method: "POST" });
                      setCourse(result.course);
                      setNotice(result.course.isPublished ? "Course published." : "Course moved to draft.");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to change publish state");
                    } finally {
                      setSavingCourse(false);
                    }
                  }}
                >
                  {course?.isPublished ? "Unpublish" : "Publish"}
                </Button>
              </div>
            </form>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            {notice && <p className="text-sm text-emerald-300">{notice}</p>}
          </div>
        )}
      </Card>

      <Card title="Requests" subtitle="Approve or reject pending access requests." className="w-full">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No pending requests.</p>
        ) : (
          <div className="grid gap-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {request.user.fullName?.trim() || request.user.email}
                    </p>
                    <div className="grid gap-1 text-xs text-[var(--text-muted)]">
                      <span>Email: {request.user.email}</span>
                      <span>Requested: {new Date(request.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={savingRequestId !== null}
                      onClick={async () => {
                        setSavingRequestId(request.id);
                        setError(null);
                        setNotice(null);
                        try {
                          await apiFetch<{ ok: true }>(`/instructor/enrollments/${request.id}/approve`, {
                            method: "POST",
                          });
                          await refreshRequests();
                          setNotice("Request approved.");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Failed to approve request");
                        } finally {
                          setSavingRequestId(null);
                        }
                      }}
                    >
                      {savingRequestId === request.id ? "Saving..." : "Approve"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={savingRequestId !== null}
                      onClick={async () => {
                        setSavingRequestId(request.id);
                        setError(null);
                        setNotice(null);
                        try {
                          await apiFetch<{ ok: true }>(`/instructor/enrollments/${request.id}/revoke`, {
                            method: "POST",
                          });
                          await refreshRequests();
                          setNotice("Request rejected.");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Failed to reject request");
                        } finally {
                          setSavingRequestId(null);
                        }
                      }}
                    >
                      {savingRequestId === request.id ? "Saving..." : "Reject"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Lessons" subtitle="Add and manage course lessons." className="w-full">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : (
          <div className="grid gap-4">
            <form
              className="grid gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/60 p-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (savingLesson || !newLesson.title.trim()) return;
                setSavingLesson(true);
                setError(null);
                setNotice(null);
                try {
                  const result = await apiFetch<{ lesson: Lesson }>(`/instructor/courses/${id}/lessons`, {
                    method: "POST",
                    body: JSON.stringify(newLesson),
                  });
                  setLessons((prev) => [...prev, result.lesson]);
                  setNewLesson({ title: "", videoUrl: "", pdfUrl: "" });
                  setNotice("Lesson added.");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to add lesson");
                } finally {
                  setSavingLesson(false);
                }
              }}
            >
              <Input
                type="text"
                name="newLessonTitle"
                label="Lesson title"
                value={newLesson.title}
                onChange={(event) => setNewLesson((prev) => ({ ...prev, title: event.target.value }))}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="url"
                  name="newLessonVideo"
                  label="Video URL"
                  value={newLesson.videoUrl}
                  onChange={(event) => setNewLesson((prev) => ({ ...prev, videoUrl: event.target.value }))}
                />
                <Input
                  type="url"
                  name="newLessonPdf"
                  label="PDF URL"
                  value={newLesson.pdfUrl}
                  onChange={(event) => setNewLesson((prev) => ({ ...prev, pdfUrl: event.target.value }))}
                />
              </div>
              <div>
                <Button type="submit" disabled={savingLesson || !newLesson.title.trim()}>
                  {savingLesson ? "Adding..." : "Add lesson"}
                </Button>
              </div>
            </form>

            {lessons.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No lessons yet.</p>
            ) : (
              <div className="grid gap-3">
                {lessons.map((lesson) => {
                  const editing = editingLessonId === lesson.id;
                  return (
                    <div
                      key={lesson.id}
                      className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-3"
                    >
                      {editing ? (
                        <form
                          className="grid gap-3"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            if (savingLesson || !editingLesson.title.trim()) return;
                            setSavingLesson(true);
                            setError(null);
                            setNotice(null);
                            try {
                              const result = await apiFetch<{ lesson: Lesson }>(`/instructor/lessons/${lesson.id}`, {
                                method: "PATCH",
                                body: JSON.stringify(editingLesson),
                              });
                              setLessons((prev) =>
                                prev.map((item) => (item.id === lesson.id ? result.lesson : item))
                              );
                              setEditingLessonId(null);
                              setNotice("Lesson updated.");
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Failed to update lesson");
                            } finally {
                              setSavingLesson(false);
                            }
                          }}
                        >
                          <Input
                            type="text"
                            name={`edit-title-${lesson.id}`}
                            label="Lesson title"
                            value={editingLesson.title}
                            onChange={(event) =>
                              setEditingLesson((prev) => ({ ...prev, title: event.target.value }))
                            }
                          />
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input
                              type="url"
                              name={`edit-video-${lesson.id}`}
                              label="Video URL"
                              value={editingLesson.videoUrl}
                              onChange={(event) =>
                                setEditingLesson((prev) => ({ ...prev, videoUrl: event.target.value }))
                              }
                            />
                            <Input
                              type="url"
                              name={`edit-pdf-${lesson.id}`}
                              label="PDF URL"
                              value={editingLesson.pdfUrl}
                              onChange={(event) =>
                                setEditingLesson((prev) => ({ ...prev, pdfUrl: event.target.value }))
                              }
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="submit" disabled={savingLesson}>
                              Save
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setEditingLessonId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="grid gap-1">
                            <p className="text-sm font-semibold text-[var(--text)]">{lesson.title}</p>
                            <div className="grid gap-1 text-xs text-[var(--text-muted)]">
                              {lesson.videoUrl && <span>Video: {lesson.videoUrl}</span>}
                              {lesson.pdfUrl && <span>PDF: {lesson.pdfUrl}</span>}
                              <span>Created: {new Date(lesson.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={savingLesson || deletingLessonId !== null}
                              onClick={() => {
                                const source = lessonById.get(lesson.id);
                                setEditingLessonId(lesson.id);
                                setEditingLesson({
                                  title: source?.title ?? "",
                                  videoUrl: source?.videoUrl ?? "",
                                  pdfUrl: source?.pdfUrl ?? "",
                                });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={savingLesson || deletingLessonId !== null}
                              onClick={() => {
                                setError(null);
                                setNotice(null);
                                setLessonToDelete(lesson);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {lessonToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold text-[var(--text)]">Delete lesson?</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              This will permanently delete <span className="text-[var(--text)]">{lessonToDelete.title}</span>.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={deletingLessonId !== null}
                onClick={() => setLessonToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={deletingLessonId !== null}
                onClick={async () => {
                  setDeletingLessonId(lessonToDelete.id);
                  setError(null);
                  setNotice(null);
                  try {
                    await apiFetch<{ ok: true; deletedId: string }>(`/instructor/lessons/${lessonToDelete.id}`, {
                      method: "DELETE",
                    });
                    await refreshLessons();
                    setLessonToDelete(null);
                    setNotice("Lesson deleted.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to delete lesson");
                  } finally {
                    setDeletingLessonId(null);
                  }
                }}
              >
                {deletingLessonId ? "Deleting..." : "Delete Lesson"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
