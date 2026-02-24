import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AdminTable,
  adminTableCellClass,
  adminTableHeadCellClass,
  adminTableHeadRowClass,
  adminTableRowClass,
} from "../components/admin/AdminTable";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import InlineErrorState from "../components/common/InlineErrorState";
import OrdersCategoryChart from "../components/analytics/OrdersCategoryChart";
import RevenueTrendChart from "../components/analytics/RevenueTrendChart";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import GlassCard from "../components/ui/GlassCard";
import type { AnalyticsActivityEvent, AnalyticsOverview } from "../api/adminAnalytics";
import { getActivity, getOverview, getTrends, normalizeRange } from "../api/adminAnalytics";
import type { ApiError } from "../lib/api";
import Button from "../components/Button";
import { formatActorLabel, formatEventDetail, formatEventType } from "../lib/activityFormat";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function formatCompactPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  const rounded = Number.isFinite(value) ? value : 0;
  if (rounded > 0) return `+${rounded.toFixed(1)}% vs prior period`;
  if (rounded < 0) return `${rounded.toFixed(1)}% vs prior period`;
  return "0.0% vs prior period";
}

function formatSignedPoints(value: number) {
  const rounded = Number.isFinite(value) ? value : 0;
  if (rounded > 0) return `+${rounded.toFixed(1)} pts vs prior period`;
  if (rounded < 0) return `${rounded.toFixed(1)} pts vs prior period`;
  return "0.0 pts vs prior period";
}

function formatDayLabel(label: string) {
  const date = new Date(`${label}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return label;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(date);
}

function activityStatusFromEvent(eventName: string): "Completed" | "Pending" | "In Review" | "Alert" {
  if (eventName === "page_view" || eventName === "order_created") return "Completed";
  if (eventName.includes("refund")) return "Alert";
  if (eventName.includes("created")) return "In Review";
  return "Pending";
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "Completed") return "success";
  if (status === "Alert" || status === "In Review") return "warning";
  return "neutral";
}

export default function AdminAnalyticsPage() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const dateRange = normalizeRange(searchParams.get("range"));
  const debouncedSearch = useDebouncedValue(search, 300);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<Array<{ label: string; value: number }>>([]);
  const [ordersTrend, setOrdersTrend] = useState<Array<{ label: string; value: number }>>([]);
  const [activityEvents, setActivityEvents] = useState<AnalyticsActivityEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setActivityEvents([]);
    setNextCursor(null);
    setError(null);
    setErrorStatusCode(undefined);
    setErrorDetails(undefined);

    Promise.all([
      getOverview(dateRange),
      getTrends("revenue", dateRange),
      getTrends("orders", dateRange),
      getActivity(dateRange, 50, debouncedSearch || undefined),
    ])
      .then(([overviewResult, revenueResult, ordersResult, activityResult]) => {
        if (!active) return;
        setOverview(overviewResult);
        setRevenueTrend(
          revenueResult.labels.map((label, idx) => ({
            label: formatDayLabel(label),
            value: revenueResult.data[idx] ?? 0,
          }))
        );
        setOrdersTrend(
          ordersResult.labels.map((label, idx) => ({
            label: formatDayLabel(label),
            value: ordersResult.data[idx] ?? 0,
          }))
        );
        setActivityEvents(activityResult.events);
        setNextCursor(activityResult.nextCursor);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const apiErr = err as ApiError;
        setError(err instanceof Error ? err.message : "Failed to load analytics");
        setErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
        setErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dateRange, debouncedSearch, refreshKey]);

  const filteredRows = useMemo(() => {
    return activityEvents.map((event) => {
      const eventStatus = activityStatusFromEvent(event.eventName);
      return {
        id: event.id,
        time: new Date(event.createdAt),
        type: formatEventType(event.eventName),
        actor: formatActorLabel(event),
        detail: formatEventDetail(event),
        status: eventStatus,
      };
    });
  }, [activityEvents]);

  async function loadMoreActivity() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getActivity(dateRange, 50, debouncedSearch || undefined, nextCursor);
      setActivityEvents((prev) => {
        const merged = [...prev, ...result.events];
        const seen = new Set<string>();
        return merged.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      });
      setNextCursor(result.nextCursor);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(err instanceof Error ? err.message : "Failed to load more activity");
      setErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
      setErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <AdminPage>
      <GlassCard className="border-[color:var(--ui-border-strong)]">
        <AdminPageHeader
          title="Analytics Overview"
          subtitle="Admin dashboard overview with live analytics data."
          aside={<Badge tone="neutral">{dateRange === "30d" ? "Last 30 days" : "Last 7 days"}</Badge>}
          compact
        />
        {error ? (
          <InlineErrorState
            title="Unable to load analytics"
            message={error}
            statusCode={errorStatusCode}
            details={errorDetails}
            onRetry={() => setRefreshKey((prev) => prev + 1)}
          />
        ) : null}
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={overview ? formatCurrency(overview.revenue) : "—"}
          hint={overview ? formatSignedPercent(overview.deltas.revenueDeltaPct) : undefined}
          loading={loading}
        />
        <StatCard
          label="Orders"
          value={overview ? overview.orders.toLocaleString() : "—"}
          hint={overview ? formatSignedPercent(overview.deltas.ordersDeltaPct) : undefined}
          loading={loading}
        />
        <StatCard
          label="Conversion"
          value={overview ? formatCompactPercent(overview.conversionRate) : "—"}
          hint={overview ? formatSignedPoints(overview.deltas.conversionDeltaPts) : undefined}
          loading={loading}
        />
        <StatCard
          label="Active Users"
          value={overview ? overview.activeUsers.toLocaleString() : "—"}
          hint={overview ? formatSignedPercent(overview.deltas.activeUsersDeltaPct) : undefined}
          loading={loading}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <GlassCard title="Revenue Trend" subtitle="Daily revenue performance">
          {loading ? (
            <div className="h-72 animate-pulse rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)]" />
          ) : revenueTrend.length ? (
            <RevenueTrendChart data={revenueTrend} />
          ) : (
            <p className="rounded-[var(--ui-radius-md)] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-6 text-sm text-[var(--ui-text-muted)]">
              No data for selected range.
            </p>
          )}
        </GlassCard>

        <GlassCard title="Orders Trend" subtitle="Daily order volume">
          {loading ? (
            <div className="h-72 animate-pulse rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)]" />
          ) : ordersTrend.length ? (
            <OrdersCategoryChart data={ordersTrend} />
          ) : (
            <p className="rounded-[var(--ui-radius-md)] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-6 text-sm text-[var(--ui-text-muted)]">
              No data for selected range.
            </p>
          )}
        </GlassCard>
      </div>

      <GlassCard title="Recent Activity" subtitle="Latest account and order events">
        <AdminTable
          loading={loading}
          error={error}
          errorStatusCode={errorStatusCode}
          errorDetails={errorDetails}
          onRetry={() => setRefreshKey((prev) => prev + 1)}
          hasRows={filteredRows.length > 0}
          emptyMessage={debouncedSearch ? "No activity rows match your search." : "No data for selected range."}
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
              <tr key={row.id} className={adminTableRowClass}>
                <td className={`${adminTableCellClass} w-[88px] whitespace-nowrap font-mono text-xs tabular-nums text-[var(--ui-text-muted)]`}>
                  {new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(row.time)}
                </td>
                <td className={`${adminTableCellClass} w-[140px] truncate font-medium`} title={row.type}>
                  {row.type}
                </td>
                <td className={`${adminTableCellClass} w-[160px] truncate font-medium`} title={row.actor}>
                  {row.actor}
                </td>
                <td
                  className={`${adminTableCellClass} max-w-[420px] truncate text-[var(--ui-text-secondary)]`}
                  title={row.detail}
                >
                  {row.detail}
                </td>
                <td className={adminTableCellClass}>
                  <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
        {nextCursor ? (
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-4 py-0 text-sm"
              onClick={() => {
                void loadMoreActivity();
              }}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        ) : null}
        {!loading && !nextCursor && filteredRows.length > 0 ? (
          <p className="mt-3 text-center text-xs text-[var(--ui-text-muted)]">End of activity list.</p>
        ) : null}
      </GlassCard>
    </AdminPage>
  );
}
