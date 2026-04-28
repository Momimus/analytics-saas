export type PlatformRole = "SUPER_ADMIN" | "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER";
export type WorkspaceAccessRole = "SUPER_ADMIN" | "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER";

export function isSuperAdmin(role: PlatformRole | null | undefined) {
  return role === "SUPER_ADMIN";
}

export function canManageWorkspaceAccess(role: WorkspaceAccessRole | null | undefined) {
  return role === "SUPER_ADMIN" || role === "WORKSPACE_ADMIN";
}

export function platformRoleLabel(role: PlatformRole | null | undefined) {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "WORKSPACE_ADMIN") return "Workspace Admin";
  if (role === "WORKSPACE_VIEWER") return "Viewer";
  return "Unknown";
}

export function workspaceAccessRoleLabel(role: WorkspaceAccessRole | null | undefined) {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "WORKSPACE_ADMIN") return "Workspace Admin";
  if (role === "WORKSPACE_VIEWER") return "Viewer";
  return "Unknown";
}

export function workspaceAccessModeLabel(role: WorkspaceAccessRole | null | undefined) {
  if (role === "SUPER_ADMIN" || role === "WORKSPACE_ADMIN") return "Full access";
  if (role === "WORKSPACE_VIEWER") return "Read-only access";
  return "No access";
}

export function workspaceContextLabel(role: WorkspaceAccessRole | null | undefined) {
  if (role === "SUPER_ADMIN") return "Platform Access";
  return workspaceAccessRoleLabel(role);
}
