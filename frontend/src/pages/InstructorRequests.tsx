import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import Badge from "../components/ui/Badge";
import SelectPopover from "../components/ui/SelectPopover";
import { apiFetch } from "../lib/api";
import { markRequestsSeen, type PendingAccessRequest, type PendingAccessRequestsResponse } from "../lib/pendingRequests";

export default function InstructorRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PendingAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>("ALL");

  const refresh = async () => {
    const result = await apiFetch<PendingAccessRequestsResponse>("/instructor/requests");
    setRequests(result.requests);
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .then(() => {
        setError(null);
        markRequestsSeen();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load requests"))
      .finally(() => setLoading(false));
  }, []);

  const courseOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const item of requests) {
      unique.set(item.course.id, item.course.title);
    }
    return [{ label: "All courses", value: "ALL" }, ...Array.from(unique.entries()).map(([id, title]) => ({ label: title, value: id }))];
  }, [requests]);

  const visibleRequests = useMemo(() => {
    if (courseFilter === "ALL") return requests;
    return requests.filter((request) => request.course.id === courseFilter);
  }, [requests, courseFilter]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Access Requests</h1>
          <p className="text-sm text-[var(--text-muted)]">Review student access requests across your courses.</p>
        </div>
        <Button type="button" variant="ghost" onClick={() => navigate("/dashboard")}>
          Back to Home
        </Button>
      </div>

      <GlassCard
        title="Pending Requests"
        subtitle="Approve or reject incoming requests."
        actions={<Badge variant="count" tone="success">{loading ? "--" : visibleRequests.length}</Badge>}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Filter by course</span>
          <SelectPopover
            items={courseOptions}
            value={courseFilter}
            onChange={setCourseFilter}
            className="w-full sm:w-auto"
          />
        </div>

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : visibleRequests.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No pending requests.</p>
        ) : (
          <div className="grid gap-3">
            {visibleRequests.map((request) => (
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
                        setError(null);
                        try {
                          await apiFetch<{ ok: true }>(`/instructor/enrollments/${request.id}/approve`, {
                            method: "POST",
                          });
                          await refresh();
                          markRequestsSeen();
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
                        try {
                          await apiFetch<{ ok: true }>(`/instructor/enrollments/${request.id}/revoke`, {
                            method: "POST",
                          });
                          await refresh();
                          markRequestsSeen();
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
                }
              />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
