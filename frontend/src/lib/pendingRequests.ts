export type PendingAccessRequest = {
  id: string;
  status: "REQUESTED";
  createdAt: string;
  updatedAt: string;
  course: {
    id: string;
    title: string;
  };
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
};

export type PendingAccessRequestsResponse = {
  totalPending: number;
  latestPendingAt: string | null;
  requests: PendingAccessRequest[];
};

const LAST_SEEN_KEY = "lms:requests:lastSeenAt";
export const REQUESTS_SEEN_EVENT = "lms:requests:seen";

export function getLastSeenRequestsAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LAST_SEEN_KEY);
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function markRequestsSeen(timestamp = Date.now()) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SEEN_KEY, String(timestamp));
  window.dispatchEvent(new Event(REQUESTS_SEEN_EVENT));
}

export function hasUnseenPendingRequests(latestPendingAt: string | null): boolean {
  if (!latestPendingAt) return false;
  const latestMs = new Date(latestPendingAt).getTime();
  if (!Number.isFinite(latestMs)) return false;
  return latestMs > getLastSeenRequestsAt();
}
