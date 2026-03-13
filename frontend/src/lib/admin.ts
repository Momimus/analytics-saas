import { apiFetch } from "./api";

export type AdminUserListItem = {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER";
  fullName: string | null;
  createdAt: string;
  suspendedAt: string | null;
};

export type AdminUsersResponse = {
  users: AdminUserListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AuditLogListItem = {
  id: string;
  workspaceId: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AdminAuditLogsResponse = {
  logs: AuditLogListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type WorkspaceSettings = {
  workspaceId: string;
  displayName: string | null;
  updatedAt: string | null;
};

export function listAdminUsers(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "active" | "suspended";
}) {
  const query = new URLSearchParams();
  query.set("page", String(Math.max(1, params?.page ?? 1)));
  query.set("pageSize", String(Math.min(100, Math.max(20, params?.pageSize ?? 20))));
  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params?.status && params.status !== "all") {
    query.set("status", params.status);
  }
  return apiFetch<AdminUsersResponse>(`/admin/users?${query.toString()}`);
}

export function listAdminAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
}) {
  const query = new URLSearchParams();
  query.set("page", String(Math.max(1, params?.page ?? 1)));
  query.set("pageSize", String(Math.min(100, Math.max(20, params?.pageSize ?? 20))));
  if (params?.action?.trim()) {
    query.set("action", params.action.trim());
  }
  if (params?.entityType?.trim()) {
    query.set("entityType", params.entityType.trim());
  }
  return apiFetch<AdminAuditLogsResponse>(`/admin/audit-logs?${query.toString()}`);
}

export function getWorkspaceSettings() {
  return apiFetch<{ settings: WorkspaceSettings }>("/admin/settings");
}

export function updateWorkspaceSettings(input: { displayName: string }) {
  return apiFetch<{ settings: WorkspaceSettings }>("/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
