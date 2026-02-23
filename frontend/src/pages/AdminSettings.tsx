import AdminSectionNav from "../components/admin/AdminSectionNav";
import GlassCard from "../components/ui/GlassCard";

export default function AdminSettingsPage() {
  return (
    <div className="grid gap-5">
      <AdminSectionNav />
      <GlassCard title="Settings" subtitle="Workspace settings and configuration controls will appear here.">
        <p className="text-sm text-[var(--text-muted)]">This is a placeholder page for admin-level settings.</p>
      </GlassCard>
    </div>
  );
}
