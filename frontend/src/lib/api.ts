const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

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
    const error = (data as { error?: string }).error ?? "Request failed";
    throw new Error(error);
  }

  return data as T;
}
