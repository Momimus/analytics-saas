import GlassCard from "../components/ui/GlassCard";
import StatCard from "../components/ui/StatCard";
import AdminSectionNav from "../components/admin/AdminSectionNav";

const PLACEHOLDER_ROWS = [
  { metric: "Weekly Active Users", value: "--", trend: "Coming soon" },
  { metric: "API Requests", value: "--", trend: "Coming soon" },
  { metric: "Conversion Rate", value: "--", trend: "Coming soon" },
];

export default function AdminAnalyticsPage() {
  return (
    <div className="grid gap-5">
      <AdminSectionNav />

      <GlassCard
        title="Analytics Dashboard (Coming Soon)"
        subtitle="Baseline placeholders are ready for future analytics integrations."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Monthly Recurring Revenue" value="--" hint="Coming soon" />
          <StatCard label="Churn Rate" value="--" hint="Coming soon" />
          <StatCard label="New Signups" value="--" hint="Coming soon" />
        </div>
      </GlassCard>

      <GlassCard title="Key Metrics Snapshot" subtitle="Placeholder table for upcoming analytics data.">
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[color:var(--border)]">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                <th className="px-3 py-2">Metric</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER_ROWS.map((row) => (
                <tr key={row.metric} className="border-t border-[color:var(--border)] text-[var(--text)]">
                  <td className="px-3 py-2">{row.metric}</td>
                  <td className="px-3 py-2">{row.value}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{row.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
