import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminAuditLogsPage from "../AdminAuditLogs";

const mocks = vi.hoisted(() => ({
  listAdminAuditLogs: vi.fn(),
}));

vi.mock("../../lib/admin", () => ({
  listAdminAuditLogs: mocks.listAdminAuditLogs,
}));

afterEach(() => {
  vi.resetAllMocks();
});

const baseLog = {
  id: "log-1",
  workspaceId: "ws-1",
  actorId: "user-1",
  actorRole: "WORKSPACE_ADMIN",
  action: "order.created",
  entityType: "order",
  entityId: "order-1",
  metadata: null,
  ip: "127.0.0.1",
  userAgent: "vitest",
  createdAt: "2026-03-28T10:00:00.000Z",
};

describe("AdminAuditLogsPage", () => {
  it("loads audit logs and applies filters through the list API", async () => {
    mocks.listAdminAuditLogs
      .mockResolvedValueOnce({
        logs: [baseLog],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        logs: [baseLog],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        logs: [baseLog],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });

    render(<AdminAuditLogsPage />);

    expect((await screen.findAllByText("order.created")).length).toBeGreaterThan(0);
    expect(screen.getByText("Visible Entries")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Action"), {
      target: { value: "order.created" },
    });

    await waitFor(() => {
      expect(mocks.listAdminAuditLogs).toHaveBeenNthCalledWith(2, {
        page: 1,
        pageSize: 20,
        action: "order.created",
        entityType: "",
      });
    });

    fireEvent.change(screen.getByLabelText("Entity type"), {
      target: { value: "order" },
    });

    await waitFor(() => {
      expect(mocks.listAdminAuditLogs).toHaveBeenNthCalledWith(3, {
        page: 1,
        pageSize: 20,
        action: "order.created",
        entityType: "order",
      });
    });
  });

  it("shows the general empty state when no audit logs exist", async () => {
    mocks.listAdminAuditLogs.mockResolvedValue({
      logs: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });

    render(<AdminAuditLogsPage />);

    expect(await screen.findByText("No audit logs found for this workspace.")).toBeInTheDocument();
  });

  it("shows the filtered-empty state and lets the user reset filters", async () => {
    mocks.listAdminAuditLogs.mockImplementation(async ({ action, entityType }) => {
      if (action || entityType) {
        return {
          logs: [],
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 1,
        };
      }

      return {
        logs: [baseLog],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      };
    });

    render(<AdminAuditLogsPage />);

    expect((await screen.findAllByText("order.created")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Action"), {
      target: { value: "missing.action" },
    });

    expect(await screen.findByText("No audit entries match the current filters.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));

    await waitFor(() => {
      expect(mocks.listAdminAuditLogs).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 20,
        action: "",
        entityType: "",
      });
    });
    expect((await screen.findAllByText("order.created")).length).toBeGreaterThan(0);
  });

  it("shows the error state and retries loading when requested", async () => {
    mocks.listAdminAuditLogs
      .mockRejectedValueOnce(new Error("Audit logs failed"))
      .mockResolvedValueOnce({
        logs: [baseLog],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });

    render(<AdminAuditLogsPage />);

    expect(await screen.findByText("Audit logs failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect((await screen.findAllByText("order.created")).length).toBeGreaterThan(0);
    expect(mocks.listAdminAuditLogs).toHaveBeenCalledTimes(2);
  });
});
