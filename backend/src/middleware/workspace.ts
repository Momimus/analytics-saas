import type { NextFunction, Response } from "express";
import { Role, WorkspaceMemberRole } from "@prisma/client";
import prisma from "../lib/prisma.js";
import type { AuthRequest } from "./auth.js";
import { sendError } from "../utils/httpError.js";

const WORKSPACE_COOKIE = process.env.WORKSPACE_COOKIE_NAME ?? "ws";

function readWorkspaceId(req: AuthRequest) {
  const headerValue = typeof req.headers["x-workspace-id"] === "string" ? req.headers["x-workspace-id"].trim() : "";
  if (headerValue) return headerValue;

  const cookieHeader = req.headers.cookie ?? "";
  const cookieParts = cookieHeader.split(";").map((part) => part.trim());
  const cookieEntry = cookieParts.find((part) => part.startsWith(`${WORKSPACE_COOKIE}=`));
  if (!cookieEntry) return "";
  return decodeURIComponent(cookieEntry.slice(WORKSPACE_COOKIE.length + 1)).trim();
}

function isWorkspaceIdValid(value: string) {
  return /^[a-zA-Z0-9_-]{3,80}$/.test(value);
}

export function requireWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
  const workspaceId = readWorkspaceId(req);
  if (!workspaceId) {
    return sendError(res, 400, "Workspace is required", "workspace_required");
  }
  if (!isWorkspaceIdValid(workspaceId)) {
    return sendError(res, 400, "Invalid workspace id", "VALIDATION_ERROR");
  }
  req.workspaceId = workspaceId;
  return next();
}

export function resolveWorkspace(req: AuthRequest) {
  return req.workspaceId ?? readWorkspaceId(req);
}

export function requireWorkspaceRole(minRole: WorkspaceMemberRole) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
    }

    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return sendError(res, 400, "Workspace is required", "workspace_required");
    }

    if (req.user.role === Role.SUPER_ADMIN) {
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } });
      if (!workspace) {
        return sendError(res, 404, "Workspace not found", "workspace_not_found");
      }
      return next();
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user.id,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      // Compatibility path for migrated tenants where owner membership was not backfilled.
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, createdByUserId: true },
      });
      if (!workspace) {
        return sendError(res, 404, "Workspace not found", "workspace_not_found");
      }
      if (workspace.createdByUserId !== req.user.id) {
        return sendError(res, 403, "User is not a workspace member", "not_a_member");
      }

      if (
        minRole === WorkspaceMemberRole.WORKSPACE_ADMIN &&
        req.user.role !== Role.WORKSPACE_ADMIN
      ) {
        return sendError(res, 403, "Forbidden", "forbidden");
      }
      return next();
    }

    if (minRole === WorkspaceMemberRole.WORKSPACE_ADMIN && membership.role !== WorkspaceMemberRole.WORKSPACE_ADMIN) {
      return sendError(res, 403, "Forbidden", "forbidden");
    }

    return next();
  };
}
