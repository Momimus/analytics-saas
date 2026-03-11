import type { NextFunction, Response } from "express";
import { Role, WorkspaceMemberRole } from "@prisma/client";
import type { AuthRequest } from "../middleware/auth.js";

const prismaMock = {
  workspaceMember: {
    findUnique: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
  },
};

vi.mock("../lib/prisma.js", () => ({
  default: prismaMock,
}));

const { requireAdminConsoleRole } = await import("../middleware/auth.js");
const { requireWorkspace, requireWorkspaceRole } = await import("../middleware/workspace.js");

function createResponse() {
  const payload: { statusCode?: number; body?: unknown } = {};
  const res = {
    status: vi.fn((code: number) => {
      payload.statusCode = code;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      payload.body = body;
      return res;
    }),
  } as unknown as Response;
  return { res, payload };
}

describe("RBAC middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows workspace roles through admin console gate", () => {
    const next = vi.fn() as NextFunction;
    const middleware = requireAdminConsoleRole();
    const { res } = createResponse();

    const req = { user: { id: "u1", role: Role.WORKSPACE_ADMIN } } as AuthRequest;
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("allows workspace owner fallback when membership row is missing", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue(null);
    prismaMock.workspace.findUnique.mockResolvedValue({ id: "ws1", createdByUserId: "u1" });

    const next = vi.fn() as NextFunction;
    const middleware = requireWorkspaceRole(WorkspaceMemberRole.WORKSPACE_VIEWER);
    const req = {
      user: { id: "u1", role: Role.WORKSPACE_ADMIN },
      workspaceId: "ws1",
    } as AuthRequest;
    const { res } = createResponse();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns workspace_required when workspace is missing", () => {
    const next = vi.fn() as NextFunction;
    const req = { headers: {}, user: { id: "u1", role: Role.WORKSPACE_ADMIN } } as unknown as AuthRequest;
    const { res, payload } = createResponse();

    requireWorkspace(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(payload.statusCode).toBe(400);
    expect(payload.body).toMatchObject({ error: "workspace_required" });
  });

  it("allows workspace viewer on read scope", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: WorkspaceMemberRole.WORKSPACE_VIEWER });

    const next = vi.fn() as NextFunction;
    const middleware = requireWorkspaceRole(WorkspaceMemberRole.WORKSPACE_VIEWER);
    const req = {
      user: { id: "viewer-1", role: Role.WORKSPACE_VIEWER },
      workspaceId: "ws1",
    } as AuthRequest;
    const { res } = createResponse();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("denies workspace viewer on write scope", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: WorkspaceMemberRole.WORKSPACE_VIEWER });

    const next = vi.fn() as NextFunction;
    const middleware = requireWorkspaceRole(WorkspaceMemberRole.WORKSPACE_ADMIN);
    const req = {
      user: { id: "viewer-1", role: Role.WORKSPACE_VIEWER },
      workspaceId: "ws1",
    } as AuthRequest;
    const { res, payload } = createResponse();

    await middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(payload.statusCode).toBe(403);
    expect(payload.body).toMatchObject({ error: "forbidden" });
  });

  it("denies non-member access with not_a_member", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue(null);
    prismaMock.workspace.findUnique.mockResolvedValue({ id: "ws1", createdByUserId: "someone-else" });

    const next = vi.fn() as NextFunction;
    const middleware = requireWorkspaceRole(WorkspaceMemberRole.WORKSPACE_VIEWER);
    const req = {
      user: { id: "admin-1", role: Role.WORKSPACE_ADMIN },
      workspaceId: "ws1",
    } as AuthRequest;
    const { res, payload } = createResponse();

    await middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(payload.statusCode).toBe(403);
    expect(payload.body).toMatchObject({ error: "not_a_member" });
  });

  it("allows super admin on existing workspace", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ id: "ws1" });

    const next = vi.fn() as NextFunction;
    const middleware = requireWorkspaceRole(WorkspaceMemberRole.WORKSPACE_ADMIN);
    const req = {
      user: { id: "super-1", role: Role.SUPER_ADMIN },
      workspaceId: "ws1",
    } as AuthRequest;
    const { res } = createResponse();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
