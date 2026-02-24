const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
const CSRF_ENDPOINT = "/auth/csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code?: string,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function apiUrl(path: string) {
  return `${API_URL.replace(/\/$/, "")}${path}`;
}

function isMutatingMethod(method: string) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

async function fetchCsrfToken(forceRefresh = false) {
  if (csrfToken && !forceRefresh) {
    return csrfToken;
  }

  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch(apiUrl(CSRF_ENDPOINT), {
      method: "GET",
      credentials: "include",
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { csrfToken?: string };
        if (!response.ok || !data.csrfToken) {
          throw new Error("Unable to fetch CSRF token");
        }
        csrfToken = data.csrfToken;
        return data.csrfToken;
      })
      .finally(() => {
        csrfTokenPromise = null;
      });
  }

  return csrfTokenPromise;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const method = (init?.method ?? "GET").toUpperCase();
  const hasBody = init?.body !== undefined && init?.body !== null;
  const needsCsrf = isMutatingMethod(method) && path !== CSRF_ENDPOINT;

  if (hasBody && method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (needsCsrf) {
    const token = await fetchCsrfToken();
    headers.set(CSRF_HEADER_NAME, token);
  }

  const execute = async () =>
    fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });

  let response = await execute();
  let data = await response.json().catch(() => ({}));

  if (needsCsrf && !response.ok && response.status === 403) {
    const payload = data as { message?: string };
    if (payload.message === "Invalid CSRF token") {
      const freshToken = await fetchCsrfToken(true);
      headers.set(CSRF_HEADER_NAME, freshToken);
      response = await execute();
      data = await response.json().catch(() => ({}));
    }
  }

  if (!response.ok) {
    const payload = data as {
      error?: string;
      message?: string;
      fieldErrors?: Record<string, string>;
    };
    const code = typeof payload.error === "string" && payload.error.trim().length > 0 ? payload.error : undefined;
    const message = payload.message ?? code ?? "Request failed";
    throw new ApiError(message, response.status, code, payload.fieldErrors);
  }

  return data as T;
}
