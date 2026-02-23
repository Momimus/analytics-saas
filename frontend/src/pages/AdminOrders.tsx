import AdminSectionNav from "../components/admin/AdminSectionNav";
import GlassCard from "../components/ui/GlassCard";

export default function AdminOrdersPage() {
  return (
    <div className="grid gap-5">
      <AdminSectionNav />
      <GlassCard title="Orders" subtitle="Order pipeline and transaction analytics will appear here.">
        <p className="text-sm text-[var(--text-muted)]">This is a placeholder page for order performance insights.</p>
      </GlassCard>
    </div>
  );
}
