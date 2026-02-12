import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import CourseThumbnail from "../components/CourseThumbnail";
import { useAuth } from "../context/auth";
import { apiFetch } from "../lib/api";
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
    width: number;
    placement: "up" | "down";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const filterOptions: Array<{ value: "ALL" | "ENROLLED" | "NOT_ENROLLED"; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "ENROLLED", label: "Enrolled" },
    { value: "NOT_ENROLLED", label: "Not Enrolled" },
  ];

  const activeFilterLabel = filterOptions.find((option) => option.value === filter)?.label ?? "All";
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
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load courses");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isStudent]);

  useEffect(() => {
    if (!filterOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = filterRef.current?.contains(target) ?? false;
      const clickedMenu = menuRef.current?.contains(target) ?? false;
      if (!clickedTrigger && !clickedMenu) {
        setFilterOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [filterOpen]);

  useEffect(() => {
    if (!filterOpen) return;

    const updatePosition = () => {
      const rect = filterRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuHeightThreshold = 240 + 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement: "up" | "down" = spaceBelow < menuHeightThreshold ? "up" : "down";
      const viewportPadding = 8;
      const width = rect.width;
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - viewportPadding - width
      );
      const top = placement === "up" ? rect.top - 8 : rect.bottom + 8;
      setMenuPosition({ left, top, width, placement });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [filterOpen]);

  const handleToggleFilter = () => {
    if (!filterOpen) {
      const rect = filterRef.current?.getBoundingClientRect();
      if (rect) {
        const menuHeightThreshold = 240 + 8;
        const spaceBelow = window.innerHeight - rect.bottom;
        const placement: "up" | "down" = spaceBelow < menuHeightThreshold ? "up" : "down";
        const viewportPadding = 8;
        const width = rect.width;
        const left = Math.min(
          Math.max(viewportPadding, rect.left),
          window.innerWidth - viewportPadding - width
        );
        const top = placement === "up" ? rect.top - 8 : rect.bottom + 8;
        setMenuPosition({ left, top, width, placement });
      } else {
        setMenuPosition(null);
      }
    }
    setFilterOpen((prev) => !prev);
  };

  const handleRequestAccess = async (courseId: string) => {
    if (!isStudent) return;
    try {
      const result = await apiFetch<{ enrollment: { status: EnrollmentStatus } }>(
        "/courses/" + courseId + "/request-access",
        { method: "POST" }
      );
      setEnrollmentByCourseId((prev) => ({ ...prev, [courseId]: result.enrollment.status }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request access");
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
    <Card title="Courses" subtitle="Browse all available courses." className="w-full">
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      ) : error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/60 p-3 sm:grid-cols-[1fr_auto]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses by title or description"
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/70 px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <div ref={filterRef} className="relative z-10 w-full sm:w-52">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={filterOpen}
                onClick={handleToggleFilter}
                className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/70 px-4 py-2.5 text-sm text-[var(--text)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                <span>{activeFilterLabel}</span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${filterOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {filterOpen &&
                menuPosition &&
                createPortal(
                <div
                  ref={menuRef}
                  role="listbox"
                  aria-label="Course filter"
                  className="fixed z-[9999] max-h-60 overflow-auto rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/95 p-1 shadow-[var(--shadow-card)] backdrop-blur"
                  style={{
                    left: menuPosition.left,
                    width: menuPosition.width,
                    top: menuPosition.placement === "down" ? menuPosition.top : undefined,
                    bottom:
                      menuPosition.placement === "up"
                        ? Math.max(8, window.innerHeight - menuPosition.top)
                        : undefined,
                  }}
                >
                  {filterOptions.map((option) => {
                    const selected = filter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setFilter(option.value);
                          setFilterOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                            : "text-[var(--text)] hover:bg-[color:var(--surface-strong)]"
                        }`}
                      >
                        <span>{option.label}</span>
                        {selected && (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m5 13 4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>,
                document.body
              )}
            </div>
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
                className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 p-4"
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
                <div className="mt-3 flex flex-wrap gap-2">
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
    </Card>
  );
}
