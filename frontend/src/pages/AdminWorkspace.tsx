import { useMemo, useState } from "react";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import Button from "../components/Button";
import Input from "../components/Input";
import GlassCard from "../components/ui/GlassCard";
import Select from "../components/ui/Select";
import { canManageWorkspace, useAuth } from "../context/auth";
import { useWorkspace } from "../context/workspace";
import type { ApiError } from "../lib/api";
import { createWorkspace, upsertWorkspaceMember } from "../lib/workspaces";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function roleLabel(role: "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER") {
  return role === "WORKSPACE_ADMIN" ? "Workspace Admin" : "Workspace Viewer";
}

export default function AdminWorkspacePage() {
  const { user } = useAuth();
  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    refreshWorkspaces,
    loading: workspaceLoading,
  } = useWorkspace();
  const canManageCurrentWorkspace = canManageWorkspace(user);
  const selectedWorkspace = selectedWorkspaceId
    ? workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null
    : null;

  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"WORKSPACE_ADMIN" | "WORKSPACE_VIEWER">("WORKSPACE_VIEWER");
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);

  const summaryLabel = useMemo(() => {
    if (!selectedWorkspace) return "No workspace selected";
    return `${selectedWorkspace.name} · ${roleLabel(selectedWorkspace.role)}`;
  }, [selectedWorkspace]);

  async function handleCreateWorkspace() {
    const name = createName.trim();
    if (!name) {
      setCreateError("Workspace name is required.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const result = await createWorkspace({ name });
      await refreshWorkspaces();
      setSelectedWorkspaceId(result.workspace.id);
      setCreateName("");
      setCreateSuccess(`Workspace ${result.workspace.name} created.`);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setCreateError(apiErr?.message ?? "Unable to create workspace.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpsertMember() {
    if (!selectedWorkspace) {
      setMemberError("Select a workspace first.");
      return;
    }

    const email = memberEmail.trim();
    if (!email) {
      setMemberError("Member email is required.");
      return;
    }

    setMemberSaving(true);
    setMemberError(null);
    setMemberSuccess(null);
    try {
      await upsertWorkspaceMember(selectedWorkspace.id, {
        email,
        role: memberRole,
      });
      setMemberEmail("");
      setMemberSuccess(`Member access updated for ${email}.`);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMemberError(apiErr?.message ?? "Unable to update workspace member.");
    } finally {
      setMemberSaving(false);
    }
  }

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Workspace"
          subtitle="Manage workspace context, member access, and the current tenant control surface."
          compact
        />

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Current Workspace</p>
            <p className="mt-1 truncate text-base font-semibold tracking-tight text-[var(--ui-text-primary)]">{selectedWorkspace?.name ?? "None selected"}</p>
          </div>
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-accent-soft)]/35 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Your Access</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-[var(--ui-text-primary)]">
              {selectedWorkspace ? roleLabel(selectedWorkspace.role) : user?.role === "SUPER_ADMIN" ? "Super Admin" : "No workspace"}
            </p>
          </div>
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Accessible Workspaces</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{workspaces.length}</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <GlassCard
          title="Workspace Overview"
          subtitle="Switch intentionally between tenants and keep role context visible."
        >
          {workspaceLoading ? (
            <p className="text-sm text-[var(--ui-text-muted)]">Loading workspace context...</p>
          ) : workspaces.length === 0 ? (
            <div className="rounded-[var(--ui-radius-md)] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-5 text-sm text-[var(--ui-text-muted)]">
              No workspaces are available for this account yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {workspaces.map((workspace) => {
                const isSelected = workspace.id === selectedWorkspaceId;
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => setSelectedWorkspaceId(workspace.id)}
                    className={`rounded-[var(--ui-radius-md)] border px-4 py-4 text-left transition ${
                      isSelected
                        ? "border-[color:color-mix(in_srgb,var(--accent)_38%,transparent)] bg-[color:var(--ui-accent-soft)] shadow-[var(--ui-shadow-sm)]"
                        : "border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] hover:bg-[color:var(--surface-alt)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-[var(--ui-text-primary)]">{workspace.name}</p>
                        <p className="mt-1 text-sm text-[var(--ui-text-secondary)]">/{workspace.slug}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--ui-text-muted)]">
                          {roleLabel(workspace.role)}
                        </span>
                        {isSelected ? (
                          <span className="rounded border border-[color:color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color:var(--surface)] px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--accent)]">
                            Current
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Created</p>
                        <p className="mt-1 text-[var(--ui-text-primary)]">{formatDate(workspace.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Context</p>
                        <p className="mt-1 truncate text-[var(--ui-text-primary)]">{isSelected ? summaryLabel : "Available for switch"}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </GlassCard>

        <div className="grid gap-5">
          <GlassCard title="Workspace Details" subtitle="Basic information for the current tenant.">
            {selectedWorkspace ? (
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Name</p>
                  <p className="mt-1 text-[var(--ui-text-primary)]">{selectedWorkspace.name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Slug</p>
                  <p className="mt-1 text-[var(--ui-text-primary)]">/{selectedWorkspace.slug}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Created</p>
                  <p className="mt-1 text-[var(--ui-text-primary)]">{formatDate(selectedWorkspace.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Role</p>
                  <p className="mt-1 text-[var(--ui-text-primary)]">{roleLabel(selectedWorkspace.role)}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-[var(--ui-radius-md)] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-5 text-sm text-[var(--ui-text-muted)]">
                Select a workspace to view tenant details.
              </div>
            )}
          </GlassCard>

          <GlassCard title="Permissions" subtitle="Keep member-management capability explicit by role.">
            <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-4 text-sm text-[var(--ui-text-secondary)]">
              {canManageCurrentWorkspace
                ? "You can manage workspace settings and member access for the current tenant."
                : "You have read-only workspace access. Member and settings actions are hidden."}
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <GlassCard title="Members" subtitle="Use the existing backend member upsert flow without inventing unsupported directory behavior.">
          {canManageCurrentWorkspace && selectedWorkspace ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                <Input
                  label="Member email"
                  value={memberEmail}
                  onChange={(event) => {
                    setMemberEmail(event.target.value);
                    setMemberError(null);
                    setMemberSuccess(null);
                  }}
                  placeholder="teammate@company.com"
                  autoComplete="off"
                  disabled={memberSaving}
                />
                <div>
                  <p className="mb-1.5 text-sm font-medium text-[var(--ui-text-primary)]">Role</p>
                  <Select
                    value={memberRole}
                    onChange={(value) => setMemberRole(value as "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER")}
                    ariaLabel="Select member role"
                    items={[
                      { label: "Workspace Viewer", value: "WORKSPACE_VIEWER" },
                      { label: "Workspace Admin", value: "WORKSPACE_ADMIN" },
                    ]}
                  />
                </div>
                <Button type="button" onClick={() => void handleUpsertMember()} disabled={memberSaving}>
                  {memberSaving ? "Saving..." : "Add or update member"}
                </Button>
              </div>
              <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-4 text-sm text-[var(--ui-text-secondary)]">
                <p className="font-medium text-[var(--ui-text-primary)]">Current backend support</p>
                <p className="mt-1">You can add a member or update an existing member role by email. Member listing and removal actions are not available in the current backend API, so this screen does not fake them.</p>
              </div>
              {memberError ? <p className="text-sm text-[var(--danger)]">{memberError}</p> : null}
              {memberSuccess ? <p className="text-sm text-[var(--success)]">{memberSuccess}</p> : null}
            </div>
          ) : (
            <div className="rounded-[var(--ui-radius-md)] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-5 text-sm text-[var(--ui-text-muted)]">
              {selectedWorkspace
                ? "Workspace member management is available only to workspace-managing roles."
                : "Select a workspace before managing members."}
            </div>
          )}
        </GlassCard>

        <GlassCard title="Create Workspace" subtitle="Only shown where the backend already supports workspace creation.">
          {user?.role === "SUPER_ADMIN" ? (
            <div className="grid gap-4">
              <Input
                label="Workspace name"
                value={createName}
                onChange={(event) => {
                  setCreateName(event.target.value);
                  setCreateError(null);
                  setCreateSuccess(null);
                }}
                placeholder="Northwind Analytics"
                autoComplete="off"
                disabled={creating}
              />
              <Button type="button" onClick={() => void handleCreateWorkspace()} disabled={creating}>
                {creating ? "Creating..." : "Create workspace"}
              </Button>
              {createError ? <p className="text-sm text-[var(--danger)]">{createError}</p> : null}
              {createSuccess ? <p className="text-sm text-[var(--success)]">{createSuccess}</p> : null}
            </div>
          ) : (
            <div className="rounded-[var(--ui-radius-md)] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-5 text-sm text-[var(--ui-text-muted)]">
              Workspace creation is not exposed here for your role.
            </div>
          )}
        </GlassCard>
      </div>
    </AdminPage>
  );
}
