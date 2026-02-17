describe("apiFetch CSRF behavior", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries mutating request once when CSRF token is invalid", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "csrf-token-1" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Invalid CSRF token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: "csrf-token-2" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });

    const { apiFetch } = await import("../api");
    const response = await apiFetch<{ ok: true }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ any: "payload" }),
    });

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:4000/auth/csrf");
    expect(fetchMock.mock.calls[2][0]).toBe("http://localhost:4000/auth/csrf");

    const retriedPostHeaders = new Headers((fetchMock.mock.calls[3][1] as RequestInit).headers);
    expect(retriedPostHeaders.get("x-csrf-token")).toBe("csrf-token-2");
  });
});
