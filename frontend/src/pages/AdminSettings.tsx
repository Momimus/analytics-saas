import { useEffect, useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import GlassCard from "../components/ui/GlassCard";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import { getWorkspaceSettings, updateWorkspaceSettings } from "../lib/admin";
import type { ApiError } from "../lib/api";
import { track } from "../lib/track";

export default function AdminSettingsPage() {
  const [workspaceDisplayName, setWorkspaceDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getWorkspaceSettings()
      .then((result) => {
        if (!active) return;
        setWorkspaceDisplayName(result.settings.displayName ?? "Analytics Workspace");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load settings");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function saveWorkspaceSettings() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const nextValue = workspaceDisplayName.trim() || "Analytics Workspace";
    try {
      const result = await updateWorkspaceSettings({ displayName: nextValue });
      setWorkspaceDisplayName(result.settings.displayName ?? "Analytics Workspace");
      await track("settings_updated", { metadata: { section: "workspace" } });
      setSaved(true);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Settings"
          subtitle="Workspace settings backed by per-workspace persistence."
          aside={
            <Button type="button" onClick={() => void saveWorkspaceSettings()} disabled={loading || saving}>
              {saving ? "Saving..." : loading ? "Loading..." : "Save"}
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
            disabled={loading || saving}
          />
          <p className="text-sm text-[var(--text-muted)]">
            This value is stored per workspace and loaded through the backend settings API.
          </p>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {saved ? <p className="text-sm text-[var(--success)]">Settings saved.</p> : null}
        </div>
      </GlassCard>
    </AdminPage>
  );
}
