import type { AnalyticsClient, AnalyticsEventPayload, AnalyticsInitConfig, AnalyticsMetadata } from "./types";

type AnalyticsState = {
  endpoint: string;
  apiKey?: string;
  userId?: string;
  workspaceId?: string;
  autoTrackPage: boolean;
  initialized: boolean;
  pageTrackingBound: boolean;
  csrfToken: string | null;
};

const DEFAULT_ENDPOINT = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
const CSRF_PATH = "/auth/csrf";
const TRACK_PATH = "/track";
const CSRF_HEADER = "x-csrf-token";

function safeTrim(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function withNoTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function inBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function isDevRuntime() {
  return (import.meta.env.MODE ?? "").toLowerCase() !== "production";
}

export function createAnalyticsClient(): AnalyticsClient {
  const state: AnalyticsState = {
    endpoint: DEFAULT_ENDPOINT,
    autoTrackPage: false,
    initialized: false,
    pageTrackingBound: false,
    csrfToken: null,
  };

  let csrfFetchPromise: Promise<string | null> | null = null;
  let lastPageTrackKey = "";
  let lastPageTrackAt = 0;

  function logDebug(...args: unknown[]) {
    if (!isDevRuntime()) return;
    console.debug("[analytics-sdk]", ...args);
  }

  function makeUrl(path: string) {
    return `${withNoTrailingSlash(state.endpoint)}${path}`;
  }

  async function fetchCsrfToken(forceRefresh = false): Promise<string | null> {
    if (!inBrowser()) return null;
    if (state.csrfToken && !forceRefresh) return state.csrfToken;
    if (csrfFetchPromise) return csrfFetchPromise;

    csrfFetchPromise = (async () => {
      try {
        const response = await fetch(makeUrl(CSRF_PATH), {
          method: "GET",
          credentials: "include",
        });
        const payload = (await response.json().catch(() => ({}))) as { csrfToken?: string };
        if (!response.ok || !safeTrim(payload.csrfToken)) {
          state.csrfToken = null;
          return null;
        }
        state.csrfToken = payload.csrfToken ?? null;
        return state.csrfToken;
      } catch (error) {
        state.csrfToken = null;
        logDebug("csrf fetch failed", error);
        return null;
      } finally {
        csrfFetchPromise = null;
      }
    })();

    return csrfFetchPromise;
  }

  async function send(payload: AnalyticsEventPayload): Promise<void> {
    try {
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      if (state.apiKey) {
        headers.set("x-api-key", state.apiKey);
      }

      const token = await fetchCsrfToken();
      if (token) {
        headers.set(CSRF_HEADER, token);
      }

      const doRequest = () =>
        fetch(makeUrl(TRACK_PATH), {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify(payload),
        });

      let response = await doRequest();
      if (!response.ok && response.status === 403) {
        const freshToken = await fetchCsrfToken(true);
        if (freshToken) {
          headers.set(CSRF_HEADER, freshToken);
          response = await doRequest();
        }
      }

      if (!response.ok) {
        logDebug("track request failed", response.status);
      }
    } catch (error) {
      logDebug("track request error", error);
    }
  }

  function buildPayload(eventName: string, metadata?: AnalyticsMetadata): AnalyticsEventPayload | null {
    const safeEventName = safeTrim(eventName);
    if (!safeEventName) {
      logDebug("ignored empty eventName");
      return null;
    }

    return {
      eventName: safeEventName,
      metadata,
      timestamp: new Date().toISOString(),
      ...(state.userId ? { userId: state.userId } : {}),
      ...(state.workspaceId ? { workspaceId: state.workspaceId } : {}),
    };
  }

  async function track(eventName: string, metadata?: AnalyticsMetadata): Promise<void> {
    const payload = buildPayload(eventName, metadata);
    if (!payload) return;
    await send(payload);
  }

  function setUser(userId: string) {
    state.userId = safeTrim(userId);
  }

  function setWorkspace(workspaceId?: string) {
    state.workspaceId = safeTrim(workspaceId);
  }

  async function identify(userId: string): Promise<void> {
    setUser(userId);
    await track("identify", { identifiedUserId: state.userId ?? userId });
  }

  function readPageContext(pageName?: string, metadata?: AnalyticsMetadata): AnalyticsMetadata {
    if (!inBrowser()) {
      return {
        ...(pageName ? { page: pageName } : {}),
        ...(metadata ?? {}),
      };
    }

    return {
      path: window.location.pathname + window.location.search,
      title: document.title,
      ...(pageName ? { page: pageName } : {}),
      ...(metadata ?? {}),
    };
  }

  async function page(pageName?: string, metadata?: AnalyticsMetadata): Promise<void> {
    await track("page_view", readPageContext(pageName, metadata));
  }

  function shouldTrackPageNow(key: string): boolean {
    const now = Date.now();
    if (lastPageTrackKey === key && now - lastPageTrackAt < 1200) {
      return false;
    }
    lastPageTrackKey = key;
    lastPageTrackAt = now;
    return true;
  }

  function bindAutoPageTracking() {
    if (!inBrowser() || state.pageTrackingBound) return;
    state.pageTrackingBound = true;

    const firePageTrack = () => {
      const path = window.location.pathname + window.location.search;
      if (!shouldTrackPageNow(path)) return;
      void page(undefined, { path, title: document.title });
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = (...args: Parameters<History["pushState"]>) => {
      originalPushState(...args);
      firePageTrack();
    };
    window.history.replaceState = (...args: Parameters<History["replaceState"]>) => {
      originalReplaceState(...args);
      firePageTrack();
    };
    window.addEventListener("popstate", firePageTrack);
    window.addEventListener("hashchange", firePageTrack);

    firePageTrack();
  }

  function init(config: AnalyticsInitConfig) {
    try {
      const endpoint = safeTrim(config.endpoint);
      if (!endpoint) {
        logDebug("init ignored due to missing endpoint");
        return;
      }
      state.endpoint = endpoint;
      state.apiKey = safeTrim(config.apiKey);
      state.userId = safeTrim(config.userId);
      state.workspaceId = safeTrim(config.workspaceId);
      state.autoTrackPage = Boolean(config.autoTrackPage);
      state.initialized = true;
      if (state.autoTrackPage) {
        bindAutoPageTracking();
      }
    } catch (error) {
      logDebug("init failed", error);
    }
  }

  function reset() {
    state.userId = undefined;
    state.workspaceId = undefined;
    state.csrfToken = null;
  }

  return {
    init,
    track,
    identify,
    page,
    setUser,
    setWorkspace,
    reset,
  };
}

const analytics = createAnalyticsClient();

if (inBrowser()) {
  window.analytics = analytics;
}

export default analytics;
