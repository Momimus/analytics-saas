const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const method = (init?.method ?? "GET").toUpperCase();
  const hasBody = init?.body !== undefined && init?.body !== null;

  if (hasBody && method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const payload = data as {
      error?: string;
      message?: string;
      fieldErrors?: Record<string, string>;
    };
    const message = payload.message ?? payload.error ?? "Request failed";
    throw new ApiError(message, response.status, payload.error, payload.fieldErrors);
  }

  return data as T;
}
