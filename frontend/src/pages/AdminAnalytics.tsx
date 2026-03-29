import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, DollarSign, Package, ShoppingCart } from "lucide-react";
import {
  AdminTable,
  adminTableCellClass,
  adminTableHeadCellClass,
  adminTableHeadRowClass,
  adminTableRowClass,
} from "../components/admin/AdminTable";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import InlineErrorState from "../components/common/InlineErrorState";
import AnalyticsInsightList from "../components/analytics/AnalyticsInsightList";
import AnalyticsMetricCard from "../components/analytics/AnalyticsMetricCard";
import OrdersCategoryChart from "../components/analytics/OrdersCategoryChart";
import ProductPerformanceChart from "../components/analytics/ProductPerformanceChart";
import RecentOrdersTable from "../components/analytics/RecentOrdersTable";
import RevenueTrendChart from "../components/analytics/RevenueTrendChart";
import Badge from "../components/ui/Badge";
import GlassCard from "../components/ui/GlassCard";
import type { AnalyticsActivityEvent, AnalyticsOverview } from "../api/adminAnalytics";
import { getActivity, getOverview, getTrends, listAdminOrders, listAdminProducts, normalizeRange } from "../api/adminAnalytics";
import type { ApiError } from "../lib/api";
import Button from "../components/Button";
import { formatActorLabel, formatEventDetail, formatEventType } from "../lib/activityFormat";
import { useWorkspace } from "../context/workspace";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function formatCompactPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  const rounded = Number.isFinite(value) ? value : 0;
  if (rounded > 0) return `+${rounded.toFixed(1)}%`;
  if (rounded < 0) return `${rounded.toFixed(1)}%`;
  return "0.0%";
}

function formatSignedPoints(value: number) {
  const rounded = Number.isFinite(value) ? value : 0;
  if (rounded > 0) return `+${rounded.toFixed(1)} pts`;
  if (rounded < 0) return `${rounded.toFixed(1)} pts`;
  return "0.0 pts";
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

function sameUtcDay(date: Date, target: Date) {
  return date.getUTCFullYear() === target.getUTCFullYear()
    && date.getUTCMonth() === target.getUTCMonth()
    && date.getUTCDate() === target.getUTCDate();
}

export default function AdminAnalyticsPage() {
  const [searchParams] = useSearchParams();
  const { selectedWorkspaceId } = useWorkspace();
  const search = searchParams.get("q") ?? "";
  const dateRange = normalizeRange(searchParams.get("range"));
  const debouncedSearch = useDebouncedValue(search, 300);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<Array<{ label: string; value: number }>>([]);
  const [ordersTrend, setOrdersTrend] = useState<Array<{ label: string; value: number }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; isActive: boolean; orders: number; events: number }>>([]);
  const [recentOrders, setRecentOrders] = useState<Array<{ id: string; createdAt: string; amount: number; status: string; productName: string }>>([]);
  const [activityEvents, setActivityEvents] = useState<AnalyticsActivityEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const isInitialLoad = !hasLoadedOnce;

    if (isInitialLoad) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError(null);
    setErrorStatusCode(undefined);
    setErrorDetails(undefined);

    Promise.all([
      getOverview(dateRange),
      getTrends("revenue", dateRange),
      getTrends("orders", dateRange),
      getActivity(dateRange, 50, debouncedSearch || undefined),
      listAdminProducts({ limit: 100, showArchived: true }),
      listAdminOrders({ limit: 6 }),
    ])
      .then(([overviewResult, revenueResult, ordersResult, activityResult, productsResult, ordersResultList]) => {
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
        setProducts(
          productsResult.products.map((product) => ({
            id: product.id,
            name: product.name,
            isActive: product.isActive !== false,
            orders: product._count?.orders ?? 0,
            events: product._count?.events ?? 0,
          }))
        );
        setRecentOrders(
          ordersResultList.orders.map((order) => ({
            id: order.id,
            createdAt: order.createdAt,
            amount: order.amount,
            status: order.status,
            productName: order.product?.name ?? order.productId,
          }))
        );
        setHasLoadedOnce(true);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const apiErr = err as ApiError;
        setError(err instanceof Error ? err.message : "Failed to load analytics");
        setErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
        setErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setIsRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [dateRange, debouncedSearch, refreshKey, selectedWorkspaceId, hasLoadedOnce]);

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

  const today = new Date();
  const eventsToday = activityEvents.filter((event) => sameUtcDay(new Date(event.createdAt), today)).length;
  const activeProducts = products.filter((product) => product.isActive).length;
  const productPerformance = [...products]
    .sort((left, right) => (right.orders + right.events) - (left.orders + left.events))
    .slice(0, 6)
    .map((product) => ({
      label: product.name,
      orders: product.orders,
      events: product.events,
    }));

  const insightItems = useMemo(() => {
    const topProduct = [...products].sort((left, right) => (right.orders + right.events) - (left.orders + left.events))[0];
    const eventCounts = new Map<string, number>();
    for (const event of activityEvents) {
      eventCounts.set(event.eventName, (eventCounts.get(event.eventName) ?? 0) + 1);
    }
    const topEvent = [...eventCounts.entries()].sort((left, right) => right[1] - left[1])[0];
    const recentOrdersSlice = ordersTrend.slice(-3).reduce((sum, point) => sum + point.value, 0);
    const previousOrdersSlice = ordersTrend.slice(-6, -3).reduce((sum, point) => sum + point.value, 0);
    const spikeLabel = recentOrdersSlice > previousOrdersSlice
      ? `${recentOrdersSlice - previousOrdersSlice} more orders than the prior window`
      : previousOrdersSlice > recentOrdersSlice
        ? `${previousOrdersSlice - recentOrdersSlice} fewer orders than the prior window`
        : "Order pace is steady across the latest windows";

    return [
      {
        title: "Most Active Product",
        value: topProduct ? topProduct.name : "No product activity yet",
        note: topProduct
          ? `${topProduct.orders} orders and ${topProduct.events} events in the current catalog snapshot.`
          : "Create products and track events to surface performance leaders.",
      },
      {
        title: "Top Event",
        value: topEvent ? formatEventType(topEvent[0]) : "No tracked events yet",
        note: topEvent
          ? `${topEvent[1]} occurrences in the current recent activity feed.`
          : "Recent events will appear here once your workspace traffic starts flowing.",
      },
      {
        title: "Recent Signal",
        value: recentOrdersSlice > previousOrdersSlice ? "Upward order pulse" : recentOrdersSlice < previousOrdersSlice ? "Cooling order pace" : "Stable order pace",
        note: spikeLabel,
      },
    ];
  }, [activityEvents, ordersTrend, products]);

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

  const hasRevenueData = revenueTrend.some((point) => point.value > 0);
  const hasOrdersData = ordersTrend.some((point) => point.value > 0);
  const hasProductPerformance = productPerformance.some((point) => point.orders > 0 || point.events > 0);

  return (
    <AdminPage>
      <GlassCard className="overflow-hidden border-[color:var(--ui-border-strong)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(244,248,255,0.88))]">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_58%)] xl:block" />
        <AdminPageHeader
          title="Analytics Command Center"
          subtitle="Monitor revenue, orders, product momentum, and recent workspace activity from a single control surface."
          aside={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge tone="neutral">{dateRange === "30d" ? "Last 30 days" : "Last 7 days"}</Badge>
              {isRefreshing ? <Badge tone="warning">Updating…</Badge> : null}
              <Button type="button" variant="ghost" className="h-9 px-4 py-0 text-sm" onClick={() => setRefreshKey((prev) => prev + 1)}>
                Refresh
              </Button>
            </div>
          }
          compact
        />
        <div className="mt-4 grid gap-3 text-sm text-[var(--ui-text-secondary)] sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-white/70 px-4 py-3 shadow-[var(--ui-shadow-sm)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Workspace Pulse</p>
            <p className="mt-2 font-medium text-[var(--ui-text-primary)]">Search-aware activity feed with live KPI refresh.</p>
          </div>
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-white/70 px-4 py-3 shadow-[var(--ui-shadow-sm)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Catalog Signal</p>
            <p className="mt-2 font-medium text-[var(--ui-text-primary)]">Top products are ranked using current order and event density.</p>
          </div>
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-white/70 px-4 py-3 shadow-[var(--ui-shadow-sm)] sm:col-span-2 xl:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Operator View</p>
            <p className="mt-2 font-medium text-[var(--ui-text-primary)]">Recent orders and activity stay visible without leaving the dashboard.</p>
          </div>
        </div>
        {error ? (
          <div className="mt-5">
            <InlineErrorState
              title="Unable to load analytics"
              message={error}
              statusCode={errorStatusCode}
              details={errorDetails}
              onRetry={() => setRefreshKey((prev) => prev + 1)}
            />
          </div>
        ) : null}
      </GlassCard>

      <section className={`grid gap-4 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-4 ${isRefreshing ? "opacity-90" : "opacity-100"}`}>
        <AnalyticsMetricCard
          label="Total Revenue"
          value={overview ? formatCurrency(overview.revenue) : "$0"}
          delta={overview?.deltas.revenueDeltaPct}
          deltaLabel={overview ? formatSignedPercent(overview.deltas.revenueDeltaPct) : undefined}
          sublabel="Versus prior period"
          loading={loading}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <AnalyticsMetricCard
          label="Total Orders"
          value={overview ? overview.orders.toLocaleString() : "0"}
          delta={overview?.deltas.ordersDeltaPct}
          deltaLabel={overview ? formatSignedPercent(overview.deltas.ordersDeltaPct) : undefined}
          sublabel="Order flow trend"
          loading={loading}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <AnalyticsMetricCard
          label="Active Products"
          value={loading ? "0" : activeProducts.toLocaleString()}
          delta={activeProducts > 0 ? activeProducts : 0}
          deltaLabel={loading ? undefined : `${activeProducts} live`}
          sublabel="Active catalog entries"
          loading={loading}
          icon={<Package className="h-5 w-5" />}
        />
        <AnalyticsMetricCard
          label="Events Today"
          value={loading ? "0" : eventsToday.toLocaleString()}
          delta={eventsToday > 0 ? eventsToday : 0}
          deltaLabel={loading ? undefined : `${eventsToday} tracked`}
          sublabel="From recent event feed"
          loading={loading}
          icon={<Activity className="h-5 w-5" />}
        />
      </section>

      <section className={`grid gap-4 sm:gap-5 xl:grid-cols-12 transition-opacity duration-200 ${isRefreshing ? "opacity-90" : "opacity-100"}`}>
        <GlassCard title="Revenue Trend" subtitle="Daily revenue performance" className="xl:col-span-6">
          {loading ? (
            <div className="h-72 animate-pulse rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)]" />
          ) : hasRevenueData ? (
            <RevenueTrendChart data={revenueTrend} />
          ) : (
            <p className="rounded-[var(--ui-radius-md)] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-5 text-sm text-[var(--ui-text-muted)] sm:p-6">
              Revenue will appear here once completed orders start landing in this workspace.
            </p>
          )}
        </GlassCard>

        <GlassCard title="Orders Trend" subtitle="Daily order volume" className="xl:col-span-6">
          {loading ? (
            <div className="h-72 animate-pulse rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)]" />
          ) : hasOrdersData ? (
            <OrdersCategoryChart data={ordersTrend} />
          ) : (
            <p className="rounded-[var(--ui-radius-md)] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-5 text-sm text-[var(--ui-text-muted)] sm:p-6">
              Order volume will appear here once your workspace starts generating transactions.
            </p>
          )}
        </GlassCard>

        <GlassCard title="Product Performance" subtitle="Top catalog movers by orders and events" className="xl:col-span-12">
          {loading ? (
            <div className="h-72 animate-pulse rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)]" />
          ) : hasProductPerformance ? (
            <ProductPerformanceChart data={productPerformance} />
          ) : (
            <p className="rounded-[var(--ui-radius-md)] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-5 text-sm text-[var(--ui-text-muted)] sm:p-6">
              Product performance will populate after products start receiving orders or tracked events.
            </p>
          )}
        </GlassCard>
      </section>

      <section className={`grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)] transition-opacity duration-200 ${isRefreshing ? "opacity-90" : "opacity-100"}`}>
        <GlassCard title="Latest Orders" subtitle="Most recent transactions in this workspace">
          <RecentOrdersTable rows={recentOrders} loading={loading} />
        </GlassCard>

        <GlassCard title="Quick Insights" subtitle="Small summaries pulled from the current workspace snapshot">
          <AnalyticsInsightList items={insightItems} loading={loading} />
          {!loading && overview ? (
            <div className="mt-4 rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Conversion Pulse</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{formatCompactPercent(overview.conversionRate)}</p>
                <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ui-text-secondary)]">
                  {formatSignedPoints(overview.deltas.conversionDeltaPts)}
                </span>
              </div>
            </div>
          ) : null}
        </GlassCard>
      </section>

      <GlassCard title="Recent Activity" subtitle="Latest account, event, and order signals flowing through the workspace">
        <div className={`transition-opacity duration-200 ${isRefreshing ? "opacity-90" : "opacity-100"}`}>
          <AdminTable
            loading={loading}
            error={error}
            errorStatusCode={errorStatusCode}
            errorDetails={errorDetails}
            onRetry={() => setRefreshKey((prev) => prev + 1)}
            hasRows={filteredRows.length > 0}
            emptyMessage={debouncedSearch ? "No activity rows match your search." : "No recent activity for this workspace yet."}
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
                  <td className={`${adminTableCellClass} w-[118px] whitespace-nowrap font-mono text-xs tabular-nums text-[var(--ui-text-muted)]`}>
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(row.time)}
                  </td>
                  <td className={`${adminTableCellClass} w-[160px] truncate font-medium`} title={row.type}>
                    {row.type}
                  </td>
                  <td className={`${adminTableCellClass} w-[190px] truncate font-medium`} title={row.actor}>
                    {row.actor}
                  </td>
                  <td className={`${adminTableCellClass} max-w-[520px] truncate text-[var(--ui-text-secondary)]`} title={row.detail}>
                    {row.detail}
                  </td>
                  <td className={adminTableCellClass}>
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </div>
        {nextCursor ? (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-4 py-0 text-sm"
              onClick={() => {
                void loadMoreActivity();
              }}
              disabled={loadingMore || isRefreshing}
            >
              {loadingMore ? "Loading..." : "Load more activity"}
            </Button>
          </div>
        ) : null}
        {!loading && !nextCursor && filteredRows.length > 0 ? (
          <p className="mt-4 text-center text-xs text-[var(--ui-text-muted)]">You’re looking at the most recent activity available for this workspace.</p>
        ) : null}
      </GlassCard>
    </AdminPage>
  );
}
