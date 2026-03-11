export type AnalyticsMetadata = Record<string, unknown>;

export type AnalyticsInitConfig = {
  endpoint: string;
  apiKey?: string;
  userId?: string;
  workspaceId?: string;
  autoTrackPage?: boolean;
};

export type AnalyticsClient = {
  init: (config: AnalyticsInitConfig) => void;
  track: (eventName: string, metadata?: AnalyticsMetadata) => Promise<void>;
  identify: (userId: string) => Promise<void>;
  page: (pageName?: string, metadata?: AnalyticsMetadata) => Promise<void>;
  setUser: (userId: string) => void;
  setWorkspace: (workspaceId?: string) => void;
  reset: () => void;
};

type AnalyticsState = {
  endpoint: string;
  apiKey?: string;
  userId?: string;
  workspaceId?: string;
  autoTrackPage: boolean;
  pageTrackingBound: boolean;
  csrfToken: string | null;
};

const CSRF_PATH = "/auth/csrf";
const TRACK_PATH = "/track";
const CSRF_HEADER = "x-csrf-token";

function safeTrim(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function inBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function removeTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function createAnalyticsClient(): AnalyticsClient {
  const state: AnalyticsState = {
    endpoint: "",
    autoTrackPage: false,
    pageTrackingBound: false,
    csrfToken: null,
  };

  let csrfFetchPromise: Promise<string | null> | null = null;
  let lastPageTrackKey = "";
  let lastPageTrackAt = 0;

  function logDebug(...args: unknown[]) {
    if (!inBrowser()) return;
    const runtime =
      typeof process !== "undefined" && process.env && process.env.NODE_ENV
        ? process.env.NODE_ENV
        : "development";
    if (runtime !== "production") {
      console.debug("[analytics-sdk]", ...args);
    }
  }

  function makeUrl(path: string) {
    return `${removeTrailingSlash(state.endpoint)}${path}`;
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
        const token = safeTrim(payload.csrfToken);
        state.csrfToken = response.ok && token ? token : null;
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

  async function send(payload: Record<string, unknown>): Promise<void> {
    try {
      const headers = new Headers({ "Content-Type": "application/json" });
      if (state.apiKey) headers.set("x-api-key", state.apiKey);

      const token = await fetchCsrfToken();
      if (token) headers.set(CSRF_HEADER, token);

      const doRequest = () =>
        fetch(makeUrl(TRACK_PATH), {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify(payload),
        });

      let response = await doRequest();
      if (!response.ok && response.status === 403) {
        const fresh = await fetchCsrfToken(true);
        if (fresh) {
          headers.set(CSRF_HEADER, fresh);
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

  async function track(eventName: string, metadata?: AnalyticsMetadata): Promise<void> {
    const safeEventName = safeTrim(eventName);
    if (!safeEventName || !state.endpoint) return;
    await send({
      eventName: safeEventName,
      metadata,
      timestamp: new Date().toISOString(),
      ...(state.userId ? { userId: state.userId } : {}),
      ...(state.workspaceId ? { workspaceId: state.workspaceId } : {}),
    });
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

  function pageContext(pageName?: string, metadata?: AnalyticsMetadata): AnalyticsMetadata {
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
    await track("page_view", pageContext(pageName, metadata));
  }

  function shouldTrackPage(path: string): boolean {
    const now = Date.now();
    if (lastPageTrackKey === path && now - lastPageTrackAt < 1200) return false;
    lastPageTrackKey = path;
    lastPageTrackAt = now;
    return true;
  }

  function bindAutoPageTracking() {
    if (!inBrowser() || state.pageTrackingBound) return;
    state.pageTrackingBound = true;

    const fire = () => {
      const path = window.location.pathname + window.location.search;
      if (!shouldTrackPage(path)) return;
      void page(undefined, { path, title: document.title });
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = (...args: Parameters<History["pushState"]>) => {
      originalPushState(...args);
      fire();
    };
    window.history.replaceState = (...args: Parameters<History["replaceState"]>) => {
      originalReplaceState(...args);
      fire();
    };
    window.addEventListener("popstate", fire);
    window.addEventListener("hashchange", fire);
    fire();
  }

  function init(config: AnalyticsInitConfig) {
    const endpoint = safeTrim(config.endpoint);
    if (!endpoint) {
      logDebug("init skipped: endpoint is required");
      return;
    }
    state.endpoint = endpoint;
    state.apiKey = safeTrim(config.apiKey);
    state.userId = safeTrim(config.userId);
    state.workspaceId = safeTrim(config.workspaceId);
    state.autoTrackPage = Boolean(config.autoTrackPage);
    if (state.autoTrackPage) bindAutoPageTracking();
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

export default analytics;

