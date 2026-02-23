import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AdminTable,
  adminTableCellClass,
  adminTableHeadCellClass,
  adminTableHeadRowClass,
  adminTableRowClass,
} from "../components/admin/AdminTable";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import OrdersCategoryChart from "../components/analytics/OrdersCategoryChart";
import RevenueTrendChart from "../components/analytics/RevenueTrendChart";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
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

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "Completed") return "success";
  if (status === "Alert" || status === "In Review") return "warning";
  return "neutral";
}

export default function AdminAnalyticsPage() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const dateRange = searchParams.get("range") ?? "7d";

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return ACTIVITY_ROWS;
    return ACTIVITY_ROWS.filter((row) => (
      `${row.type} ${row.actor} ${row.detail} ${row.status}`.toLowerCase().includes(needle)
    ));
  }, [search]);

  return (
    <AdminPage>
      <GlassCard className="border-[color:var(--ui-border-strong)]">
        <AdminPageHeader
          title="Analytics Overview"
          subtitle="Admin dashboard overview with placeholder performance data."
          aside={<Badge tone="neutral">{dateRange === "30d" ? "Last 30 days" : dateRange === "90d" ? "Last 90 days" : "Last 7 days"}</Badge>}
          compact
        />
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value="$128,540" hint="+8.2% vs prior period" />
        <StatCard label="Orders" value="430" hint="+5.1% vs prior period" />
        <StatCard label="Conversion" value="3.9%" hint="+0.4 pts vs prior period" />
        <StatCard label="Active Users" value="2,184" hint="+9.7% vs prior period" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
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
          density="comfortable"
        >
          <thead>
            <tr className={adminTableHeadRowClass}>
              <th className={adminTableHeadCellClass}>Time</th>
              <th className={adminTableHeadCellClass}>Type</th>
              <th className={adminTableHeadCellClass}>Actor</th>
              <th className={adminTableHeadCellClass}>Detail</th>
              <th className={adminTableHeadCellClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={`${row.time}-${row.actor}-${row.detail}`} className={adminTableRowClass}>
                <td className={`${adminTableCellClass} w-[88px] whitespace-nowrap font-mono text-xs tabular-nums text-[var(--ui-text-muted)]`}>{row.time}</td>
                <td className={`${adminTableCellClass} w-[108px] font-medium`}>{row.type}</td>
                <td className={`${adminTableCellClass} w-[160px] truncate font-medium`}>{row.actor}</td>
                <td className={`${adminTableCellClass} max-w-[420px] truncate text-[var(--ui-text-secondary)]`}>{row.detail}</td>
                <td className={adminTableCellClass}>
                  <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </GlassCard>
    </AdminPage>
  );
}
