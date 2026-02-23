import GlassCard from "../components/ui/GlassCard";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";

export default function AdminOrdersPage() {
  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Orders"
          subtitle="Order pipeline and transaction analytics will appear here."
          compact
        />
        <p className="text-sm text-[var(--text-muted)]">This is a placeholder page for order performance insights.</p>
      </GlassCard>
    </AdminPage>
  );
}
