import AdminSectionNav from "../components/admin/AdminSectionNav";
import GlassCard from "../components/ui/GlassCard";

export default function AdminEventsPage() {
  return (
    <div className="grid gap-5">
      <AdminSectionNav />
      <GlassCard title="Events" subtitle="Operational activity and event stream tools will appear here.">
        <p className="text-sm text-[var(--text-muted)]">This is a placeholder page for event and activity monitoring.</p>
      </GlassCard>
    </div>
  );
}
