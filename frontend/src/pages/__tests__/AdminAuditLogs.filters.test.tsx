import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AuditLog } from "../../lib/admin";
import AdminAuditLogsPage from "../AdminAuditLogs";

const { listAdminAuditLogsMock } = vi.hoisted(() => ({
  listAdminAuditLogsMock: vi.fn(),
}));

vi.mock("../../lib/admin", async () => {
  const actual = await vi.importActual<typeof import("../../lib/admin")>("../../lib/admin");
  return {
    ...actual,
    listAdminAuditLogs: listAdminAuditLogsMock,
  };
});

describe("AdminAuditLogs filters", () => {
  beforeEach(() => {
    const logs: AuditLog[] = [
      {
        id: "log-1",
        actorId: "actor-1",
        actorRole: "ADMIN",
        action: "USER_SUSPENDED",
        entityType: "User",
        entityId: "user-1",
        metadata: { reason: "policy" },
        ip: "127.0.0.1",
        userAgent: "vitest",
        createdAt: "2026-02-18T00:00:00.000Z",
      },
    ];

    listAdminAuditLogsMock.mockReset();
    listAdminAuditLogsMock.mockResolvedValue({
      logs,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("renders filter controls and applies actor filter", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/audit-logs"]}>
        <Routes>
          <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(listAdminAuditLogsMock).toHaveBeenCalled());

    const actorInput = screen.getByPlaceholderText("Actor id");
    expect(screen.getByText("Reset filters")).toBeInTheDocument();
    expect(screen.getByText("Refresh")).toBeInTheDocument();
    expect(actorInput).toBeInTheDocument();

    fireEvent.change(actorInput, { target: { value: "actor-123" } });

    await waitFor(() => {
      const lastCall = listAdminAuditLogsMock.mock.calls.at(-1)?.[0] as URLSearchParams;
      expect(lastCall.get("actorId")).toBe("actor-123");
    });
  });
});
