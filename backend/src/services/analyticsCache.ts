const analyticsResponseCache = new Map<string, { expiresAt: number; payload: unknown }>();

function nowMs() {
  return Date.now();
}

export function getAnalyticsCachedPayload<T>(key: string): T | null {
  const hit = analyticsResponseCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= nowMs()) {
    analyticsResponseCache.delete(key);
    return null;
  }
  return hit.payload as T;
}

export function setAnalyticsCachedPayload(key: string, payload: unknown, ttlMs: number) {
  analyticsResponseCache.set(key, {
    payload,
    expiresAt: nowMs() + ttlMs,
  });
}

export function invalidateAnalyticsWorkspaceCache(workspaceId: string) {
  const workspaceToken = `:${workspaceId}:`;
  for (const key of analyticsResponseCache.keys()) {
    if (key.includes(workspaceToken)) {
      analyticsResponseCache.delete(key);
    }
  }
}

export function __resetAnalyticsCacheForTests() {
  analyticsResponseCache.clear();
}
