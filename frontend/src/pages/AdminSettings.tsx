import GlassCard from "../components/ui/GlassCard";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";

export default function AdminSettingsPage() {
  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Settings"
          subtitle="Workspace settings and configuration controls will appear here."
          compact
        />
        <p className="text-sm text-[var(--text-muted)]">This is a placeholder page for admin-level settings.</p>
      </GlassCard>
    </AdminPage>
  );
}
