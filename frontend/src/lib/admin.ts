import { apiFetch } from "./api";

export type AdminUser = {
  id: string;
  email: string;
  role: "ADMIN";
  fullName: string | null;
  createdAt: string;
  suspendedAt: string | null;
};

export type AuditLog = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type PaginatedResponse<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
} & T;

export function listAdminUsers(params: URLSearchParams) {
  return apiFetch<PaginatedResponse<{ users: AdminUser[] }>>(`/admin/users?${params.toString()}`);
}

export function listAdminAuditLogs(params: URLSearchParams) {
  return apiFetch<PaginatedResponse<{ logs: AuditLog[] }>>(`/admin/audit-logs?${params.toString()}`);
}
