import { useEffect, useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import GlassCard from "../components/ui/GlassCard";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import { track } from "../lib/track";

const WORKSPACE_NAME_STORAGE_KEY = "workspaceDisplayName";

export default function AdminSettingsPage() {
  const [workspaceDisplayName, setWorkspaceDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const current = window.localStorage.getItem(WORKSPACE_NAME_STORAGE_KEY) ?? "Analytics Workspace";
    setWorkspaceDisplayName(current);
  }, []);

  async function saveWorkspaceSettings() {
    setSaving(true);
    setSaved(false);
    const nextValue = workspaceDisplayName.trim() || "Analytics Workspace";
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WORKSPACE_NAME_STORAGE_KEY, nextValue);
    }
    setWorkspaceDisplayName(nextValue);
    await track("settings_updated", { metadata: { section: "workspace" } });
    setSaved(true);
    setSaving(false);
  }

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Settings"
          subtitle="Workspace settings and configuration controls will appear here."
          aside={
            <Button type="button" onClick={() => void saveWorkspaceSettings()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          }
          compact
        />
        <div className="max-w-md space-y-3">
          <Input
            label="Workspace display name"
            value={workspaceDisplayName}
            onChange={(event) => {
              setWorkspaceDisplayName(event.target.value);
              setSaved(false);
            }}
            placeholder="Analytics Workspace"
          />
          <p className="text-sm text-[var(--text-muted)]">
            This setting is stored locally for now and will be connected to backend settings later.
          </p>
          {saved ? <p className="text-sm text-[var(--success)]">Settings saved.</p> : null}
        </div>
      </GlassCard>
    </AdminPage>
  );
}
