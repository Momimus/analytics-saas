import GlassCard from "../components/ui/GlassCard";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";

export default function AdminEventsPage() {
  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Events"
          subtitle="Operational activity and event stream tools will appear here."
          compact
        />
        <p className="text-sm text-[var(--text-muted)]">This is a placeholder page for event and activity monitoring.</p>
      </GlassCard>
    </AdminPage>
  );
}
