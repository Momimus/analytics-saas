import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import NotificationDot from "../components/ui/NotificationDot";
import { apiFetch } from "../lib/api";
import {
  hasUnseenPendingRequests,
  markRequestsSeen,
  type PendingAccessRequest,
  type PendingAccessRequestsResponse,
} from "../lib/pendingRequests";
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
  const [pendingRequests, setPendingRequests] = useState<PendingAccessRequest[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [latestPendingAt, setLatestPendingAt] = useState<string | null>(null);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [requestsExpanded, setRequestsExpanded] = useState(false);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);
  const [pulsePendingDot, setPulsePendingDot] = useState(false);
  const previousPendingTotalRef = useRef(0);

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

  useEffect(() => {
    if (!isInstructorRole) {
      setPendingRequests([]);
      setPendingTotal(0);
      setLatestPendingAt(null);
      setRequestsLoading(false);
      setRequestsError(null);
      setRequestsExpanded(false);
      return;
    }
    setRequestsLoading(true);
    apiFetch<PendingAccessRequestsResponse>("/instructor/requests?limit=5")
      .then((result) => {
        setPendingRequests(result.requests);
        setPendingTotal(result.totalPending);
        setLatestPendingAt(result.latestPendingAt);
        setRequestsError(null);
      })
      .catch((err) => {
        setRequestsError(err instanceof Error ? err.message : "Failed to load pending requests");
      })
      .finally(() => setRequestsLoading(false));
  }, [isInstructorRole]);

  useEffect(() => {
    const previous = previousPendingTotalRef.current;
    if (pendingTotal > previous) {
      setPulsePendingDot(true);
      const timer = window.setTimeout(() => setPulsePendingDot(false), 900);
      previousPendingTotalRef.current = pendingTotal;
      return () => window.clearTimeout(timer);
    }
    previousPendingTotalRef.current = pendingTotal;
  }, [pendingTotal]);

  const instructorStats = useMemo(() => {
    const totalCourses = instructorCourses.length;
    const publishedCourses = instructorCourses.filter((course) => course.isPublished).length;
    const draftCourses = totalCourses - publishedCourses;
    const totalEnrollments = instructorCourses.reduce((sum, course) => sum + course.enrollmentsCount, 0);

    return { totalCourses, publishedCourses, draftCourses, totalEnrollments };
  }, [instructorCourses]);

  const recentCourses = useMemo(() => instructorCourses.slice(0, 3), [instructorCourses]);
  const hasUnseen = pendingTotal > 0 && hasUnseenPendingRequests(latestPendingAt);

  const refreshPendingRequests = async () => {
    if (!isInstructorRole) return;
    const result = await apiFetch<PendingAccessRequestsResponse>("/instructor/requests?limit=5");
    setPendingRequests(result.requests);
    setPendingTotal(result.totalPending);
    setLatestPendingAt(result.latestPendingAt);
  };

  return (
    <div className="grid gap-6">
      <GlassCard
        title={user?.fullName ? `Welcome, ${user.fullName}` : "Welcome"}
        subtitle={user ? `Logged in as ${user.email} (${user.role})` : "Loading..."}
      />

      {isStudent ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Enrolled Courses"
              value={summary ? summary.totalEnrolledCourses : "--"}
              hint="Active enrollments"
            />
            <StatCard
              label="Lessons Completed"
              value={summary ? summary.totalLessonsCompleted : "--"}
              hint="Across all active courses"
            />
          </div>

          <GlassCard title="My Progress" subtitle="Snapshot of your learning activity.">
            {summary ? (
              <div className="grid gap-1 text-sm text-[var(--text-muted)]">
                <p>Enrolled courses: {summary.totalEnrolledCourses}</p>
                <p>Lessons completed: {summary.totalLessonsCompleted}</p>
              </div>
            ) : progressError ? (
              <p className="text-sm text-rose-300">{progressError}</p>
            ) : progressLoading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading...</p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No progress data yet.</p>
            )}
          </GlassCard>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => navigate("/courses")}>View courses</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/my-courses")}>My courses</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/profile")}>Open profile</Button>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Courses" value={instructorLoading ? "--" : instructorStats.totalCourses} />
            <StatCard label="Published" value={instructorLoading ? "--" : instructorStats.publishedCourses} />
            <StatCard label="Drafts" value={instructorLoading ? "--" : instructorStats.draftCourses} />
            <StatCard label="Enrollments" value={instructorLoading ? "--" : instructorStats.totalEnrollments} />
          </div>

          <GlassCard title="Recent Courses" subtitle="Your last updated courses.">
            {instructorLoading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading...</p>
            ) : instructorError ? (
              <p className="text-sm text-rose-300">{instructorError}</p>
            ) : recentCourses.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No courses yet.</p>
            ) : (
              <div className="grid gap-3">
                {recentCourses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-surface)] px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="grid gap-1">
                        <p className="text-sm font-semibold text-[var(--text)]">{course.title}</p>
                        <p className="text-xs text-[var(--ui-text-muted)]">
                          {course.isPublished ? "Published" : "Draft"} | Updated {new Date(course.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="ghost" onClick={() => navigate(`/instructor/courses/${course.id}`)}>Edit</Button>
                        <Button type="button" variant="ghost" onClick={() => navigate(`/instructor/courses/${course.id}/students`)}>
                          Students
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard
            title="Pending Access Requests"
            subtitle="Review and approve student access quickly."
            actions={
              <div className="flex items-center gap-2">
                <NotificationDot visible={hasUnseen} pulseOnce={pulsePendingDot} />
                <Badge variant="count" tone="success">{requestsLoading ? "--" : pendingTotal}</Badge>
              </div>
            }
          >
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setRequestsExpanded((prev) => {
                    const next = !prev;
                    if (next) {
                      markRequestsSeen();
                    }
                    return next;
                  });
                }}
              >
                {requestsExpanded ? "Hide latest" : "Review latest"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  markRequestsSeen();
                  navigate("/instructor/requests");
                }}
              >
                View all
              </Button>
            </div>

            {requestsExpanded && (
              <div className="mt-3">
                {requestsLoading ? (
                  <p className="text-sm text-[var(--text-muted)]">Loading...</p>
                ) : requestsError ? (
                  <p className="text-sm text-rose-300">{requestsError}</p>
                ) : pendingRequests.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No pending requests.</p>
                ) : (
                  <div className="grid gap-3">
                    {pendingRequests.map((request) => (
                      <GlassCard
                        key={request.id}
                        className="ui-fade-scale rounded-[var(--ui-radius-md)] p-3"
                        title={request.user.fullName?.trim() || request.user.email}
                        subtitle={`Course: ${request.course.title} | Requested: ${new Date(request.createdAt).toLocaleString()}`}
                        actions={
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              disabled={savingRequestId !== null}
                              onClick={async () => {
                                setSavingRequestId(request.id);
                                setRequestsError(null);
                                try {
                                  await apiFetch<{ ok: true }>(`/instructor/enrollments/${request.id}/approve`, {
                                    method: "POST",
                                  });
                                  await refreshPendingRequests();
                                } catch (err) {
                                  setRequestsError(err instanceof Error ? err.message : "Failed to approve request");
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
                                setRequestsError(null);
                                try {
                                  await apiFetch<{ ok: true }>(`/instructor/enrollments/${request.id}/revoke`, {
                                    method: "POST",
                                  });
                                  await refreshPendingRequests();
                                } catch (err) {
                                  setRequestsError(err instanceof Error ? err.message : "Failed to reject request");
                                } finally {
                                  setSavingRequestId(null);
                                }
                              }}
                            >
                              {savingRequestId === request.id ? "Saving..." : "Reject"}
                            </Button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => navigate("/instructor/new")}>Create course</Button>
            <Button type="button" onClick={() => navigate("/instructor")}>Go to Instructor workspace</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/courses")}>View catalog</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/profile")}>Open profile</Button>
          </div>
        </>
      )}
    </div>
  );
}
