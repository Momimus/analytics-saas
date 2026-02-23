import AdminSectionNav from "../components/admin/AdminSectionNav";
import GlassCard from "../components/ui/GlassCard";

export default function AdminProductsPage() {
  return (
    <div className="grid gap-5">
      <AdminSectionNav />
      <GlassCard title="Products" subtitle="Product catalog analytics and management will appear here.">
        <p className="text-sm text-[var(--text-muted)]">This is a placeholder page for upcoming product-level analytics modules.</p>
      </GlassCard>
    </div>
  );
}
