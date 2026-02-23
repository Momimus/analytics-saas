import GlassCard from "../components/ui/GlassCard";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";

export default function AdminProductsPage() {
  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Products"
          subtitle="Product catalog analytics and management will appear here."
          compact
        />
        <p className="text-sm text-[var(--text-muted)]">This is a placeholder page for upcoming product-level analytics modules.</p>
      </GlassCard>
    </AdminPage>
  );
}
