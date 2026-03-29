import { apiFetch } from "./api";

type WorkspaceRole = "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER";

export type WorkspaceMemberUpsertResponse = {
  member: {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    createdAt: string;
  };
};

export function createWorkspace(input: { name: string }) {
  return apiFetch<{
    workspace: {
      id: string;
      name: string;
      slug: string;
      createdAt: string;
      createdByUserId: string;
    };
  }>("/workspaces", {
    method: "POST",
    body: JSON.stringify({ name: input.name }),
  });
}

export function upsertWorkspaceMember(
  workspaceId: string,
  input: { email: string; role: WorkspaceRole }
) {
  return apiFetch<WorkspaceMemberUpsertResponse>(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      role: input.role,
    }),
  });
}