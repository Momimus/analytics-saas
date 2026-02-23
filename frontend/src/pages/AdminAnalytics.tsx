import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AdminTable } from "../components/admin/AdminTable";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import OrdersCategoryChart from "../components/analytics/OrdersCategoryChart";
import RevenueTrendChart from "../components/analytics/RevenueTrendChart";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import Select from "../components/ui/Select";
import GlassCard from "../components/ui/GlassCard";

const REVENUE_SERIES = [
  { label: "Mon", value: 9200 },
  { label: "Tue", value: 10100 },
  { label: "Wed", value: 9700 },
  { label: "Thu", value: 11800 },
  { label: "Fri", value: 12450 },
  { label: "Sat", value: 11000 },
  { label: "Sun", value: 12980 },
];

const ORDERS_BY_CATEGORY = [
  { label: "Core", value: 164 },
  { label: "Growth", value: 121 },
  { label: "Pro", value: 87 },
  { label: "Trial", value: 58 },
];

const ACTIVITY_ROWS = [
  { time: "09:31", type: "Order", actor: "Jordan P.", detail: "Upgraded to Growth plan", status: "Completed" },
  { time: "09:12", type: "Revenue", actor: "Stripe", detail: "Subscription payment captured", status: "Completed" },
  { time: "08:46", type: "User", actor: "Ari T.", detail: "Invited 3 teammates", status: "Pending" },
  { time: "08:14", type: "Order", actor: "Morgan L.", detail: "Requested invoice export", status: "In Review" },
  { time: "07:58", type: "Event", actor: "System", detail: "Usage threshold reached", status: "Alert" },
];

export default function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useState("7d");
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return ACTIVITY_ROWS;
    return ACTIVITY_ROWS.filter((row) => (
      `${row.type} ${row.actor} ${row.detail} ${row.status}`.toLowerCase().includes(needle)
    ));
  }, [search]);

  return (
    <div className="grid gap-5">
      <AdminSectionNav />

      <GlassCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Analytics</h1>
            <p className="text-sm text-[var(--text-muted)]">Admin dashboard overview with placeholder performance data.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="w-full min-w-[12rem] sm:w-40">
              <Select
                ariaLabel="Analytics date range"
                value={dateRange}
                onChange={setDateRange}
                items={[
                  { label: "Last 7 days", value: "7d" },
                  { label: "Last 30 days", value: "30d" },
                  { label: "Last 90 days", value: "90d" },
                ]}
              />
            </div>
            <label className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search activity"
                className="h-9 w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-9 text-sm text-[var(--text)]"
              />
            </label>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value="$128,540" hint="+8.2% vs prior period" />
        <StatCard label="Orders" value="430" hint="+5.1% vs prior period" />
        <StatCard label="Conversion" value="3.9%" hint="+0.4 pts vs prior period" />
        <StatCard label="Active Users" value="2,184" hint="+9.7% vs prior period" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard title="Revenue Trend" subtitle="Daily revenue performance">
          <RevenueTrendChart data={REVENUE_SERIES} />
        </GlassCard>

        <GlassCard title="Orders by Category" subtitle="Distribution by plan category">
          <OrdersCategoryChart data={ORDERS_BY_CATEGORY} />
        </GlassCard>
      </div>

      <GlassCard title="Recent Activity" subtitle="Latest account and order events">
        <AdminTable
          loading={false}
          hasRows={filteredRows.length > 0}
          emptyMessage="No activity rows match your search."
          colCount={5}
          stickyHeader
          zebraRows
        >
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Detail</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={`${row.time}-${row.actor}-${row.detail}`} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2 text-sm text-[var(--text-muted)]">{row.time}</td>
                <td className="px-3 py-2">{row.type}</td>
                <td className="px-3 py-2">{row.actor}</td>
                <td className="px-3 py-2">{row.detail}</td>
                <td className="px-3 py-2">
                  <Badge tone={row.status === "Completed" ? "success" : row.status === "Alert" ? "warning" : "neutral"}>
                    {row.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </GlassCard>
    </div>
  );
}
