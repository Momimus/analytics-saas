import { Fragment, useEffect, useMemo, useState } from "react";
import type { AnalyticsActivityEvent } from "../api/adminAnalytics";
import { getActivity } from "../api/adminAnalytics";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import {
  AdminTable,
  adminTableCellClass,
  adminTableHeadCellClass,
  adminTableHeadRowClass,
  adminTableRowClass,
} from "../components/admin/AdminTable";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import Button from "../components/Button";
import Combobox, { type ComboboxOption } from "../components/ui/Combobox";
import GlassCard from "../components/ui/GlassCard";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { appendUniqueById } from "../lib/collections";
import type { ApiError } from "../lib/api";

const PAGE_SIZE = 50;
const DEFAULT_RANGE = "30d";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  return value.slice(-8);
}

function formatMetadataPreview(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || Object.keys(metadata).length === 0) return "-";
  try {
    const json = JSON.stringify(metadata);
    if (json.length <= 80) return json;
    return `${json.slice(0, 77)}...`;
  } catch {
    return "[invalid metadata]";
  }
}

function formatMetadataBlock(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || Object.keys(metadata).length === 0) return "{}";
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "{\n  \"error\": \"invalid metadata\"\n}";
  }
}

const STATIC_EVENT_OPTIONS: ComboboxOption[] = [
  { value: "all", label: "All events" },
  { value: "page_view", label: "page_view" },
  { value: "login", label: "login" },
  { value: "logout", label: "logout" },
  { value: "product_created", label: "product_created" },
  { value: "product_archived", label: "product_archived" },
  { value: "order_created", label: "order_created" },
  { value: "order_updated", label: "order_updated" },
  { value: "settings_updated", label: "settings_updated" },
];

export default function AdminEventsPage() {
  const actionButtonClass =
    "inline-flex h-8 items-center justify-center rounded border border-[color:var(--ui-border-soft)] px-2.5 py-0 text-xs transition hover:bg-[color:var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-50";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  const [events, setEvents] = useState<AnalyticsActivityEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setErrorStatusCode(undefined);
    setErrorDetails(undefined);
    setEvents([]);
    setNextCursor(null);
    setExpandedRows({});

    getActivity(DEFAULT_RANGE, PAGE_SIZE, debouncedSearch || undefined)
      .then((result) => {
        if (!active) return;
        setEvents(result.events);
        setNextCursor(result.nextCursor);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const apiErr = err as ApiError;
        setError(err instanceof Error ? err.message : "Failed to load events");
        setErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
        setErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, refreshKey]);

  const eventTypeOptions = useMemo<ComboboxOption[]>(() => {
    const byValue = new Map<string, ComboboxOption>();
    for (const option of STATIC_EVENT_OPTIONS) {
      byValue.set(option.value, option);
    }
    for (const event of events) {
      if (!byValue.has(event.eventName)) {
        byValue.set(event.eventName, { value: event.eventName, label: event.eventName });
      }
    }
    return Array.from(byValue.values());
  }, [events]);

  const visibleEvents = useMemo(() => {
    if (eventTypeFilter === "all") return events;
    return events.filter((event) => event.eventName === eventTypeFilter);
  }, [events, eventTypeFilter]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getActivity(DEFAULT_RANGE, PAGE_SIZE, debouncedSearch || undefined, nextCursor);
      setEvents((prev) => appendUniqueById(prev, result.events));
      setNextCursor(result.nextCursor);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(err instanceof Error ? err.message : "Failed to load more events");
      setErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
      setErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const activeFilterCount = (debouncedSearch ? 1 : 0) + (eventTypeFilter !== "all" ? 1 : 0);
  const eventsWithMetadata = visibleEvents.filter((event) => event.metadata && Object.keys(event.metadata).length > 0).length;

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader title="Events Explorer" subtitle="Search and inspect analytics events with cursor-based history." compact />

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Visible Events</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{visibleEvents.length}</p>
          </div>
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-accent-soft)]/35 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Metadata Rows</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{eventsWithMetadata}</p>
          </div>
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Range</p>
            <p className="mt-1 text-sm font-medium text-[var(--ui-text-primary)]">Last 30 days</p>
          </div>
        </div>

        <div className="mt-4">
          <AdminFilterBar
            title="Event Filters"
            helper="Search event names, IDs, and metadata while narrowing the list by event type."
            activeFilterCount={activeFilterCount}
            onReset={activeFilterCount > 0 ? () => {
              setSearch("");
              setEventTypeFilter("all");
            } : undefined}
          >
            <label className="relative block md:col-span-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by event, id, metadata..."
                className="h-10 w-full rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3 text-sm text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] outline-none transition focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent-soft)]"
                autoComplete="off"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-[var(--ui-text-muted)] md:col-span-2">
              <span className="text-[var(--ui-text-primary)]">Event type</span>
              <Combobox
                value={eventTypeFilter}
                onChange={setEventTypeFilter}
                options={eventTypeOptions}
                placeholder="All events"
                ariaLabel="Filter by event type"
              />
            </label>
          </AdminFilterBar>
        </div>

        <div className="mt-4">
          <AdminTable
            loading={loading}
            error={error}
            errorStatusCode={errorStatusCode}
            errorDetails={errorDetails}
            onRetry={() => setRefreshKey((prev) => prev + 1)}
            hasRows={visibleEvents.length > 0}
            emptyMessage={activeFilterCount > 0 ? "No events match the current filters." : "No events found yet for this workspace."}
            colCount={6}
            stickyHeader
            zebraRows
            density="comfortable"
            responsiveMode="stack"
            mobileStack={
              <div className="grid gap-3">
                {visibleEvents.map((event) => {
                  const actor = event.actorLabel?.trim() || event.userId || "System";
                  const preview = formatMetadataPreview(event.metadata);
                  const expanded = Boolean(expandedRows[event.id]);
                  return (
                    <article key={event.id} className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-4 shadow-[var(--ui-shadow-sm)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--ui-text-primary)]">{event.eventName}</p>
                          <p className="mt-1 truncate text-sm text-[var(--ui-text-secondary)]" title={actor}>{actor}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(event.id)}
                          className={`${actionButtonClass} shrink-0 text-[var(--ui-text-muted)]`}
                        >
                          {expanded ? "Hide" : "View"}
                        </button>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Product</p>
                          <p className="mt-1 font-mono text-xs text-[var(--ui-text-primary)]">{shortId(event.productId)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Order</p>
                          <p className="mt-1 font-mono text-xs text-[var(--ui-text-primary)]">{shortId(event.orderId)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Date</p>
                          <p className="mt-1 text-[var(--ui-text-primary)]">{formatDateTime(event.createdAt)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Metadata</p>
                          <p className="mt-1 break-words text-sm text-[var(--ui-text-secondary)]">{preview}</p>
                        </div>
                      </div>
                      {expanded ? (
                        <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-[var(--ui-radius-sm)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] p-3 font-mono text-[11px] text-[var(--ui-text-secondary)]">
                          {formatMetadataBlock(event.metadata)}
                        </pre>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            }
          >
            <thead>
              <tr className={adminTableHeadRowClass}>
                <th className={adminTableHeadCellClass}>Event type</th>
                <th className={adminTableHeadCellClass}>Actor</th>
                <th className={adminTableHeadCellClass}>Product</th>
                <th className={adminTableHeadCellClass}>Order</th>
                <th className={adminTableHeadCellClass}>Date/time</th>
                <th className={adminTableHeadCellClass}>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((event) => {
                const actor = event.actorLabel?.trim() || event.userId || "System";
                const preview = formatMetadataPreview(event.metadata);
                const expanded = Boolean(expandedRows[event.id]);
                return (
                  <Fragment key={event.id}>
                    <tr className={adminTableRowClass} data-row-id={event.id}>
                      <td className={`${adminTableCellClass} min-w-[170px] truncate font-medium`} title={event.eventName}>
                        {event.eventName}
                      </td>
                      <td className={`${adminTableCellClass} min-w-[180px] truncate`} title={actor}>
                        {actor}
                      </td>
                      <td className={`${adminTableCellClass} w-[120px] font-mono text-xs text-[var(--ui-text-muted)]`} title={event.productId ?? "-"}>
                        {shortId(event.productId)}
                      </td>
                      <td className={`${adminTableCellClass} w-[120px] font-mono text-xs text-[var(--ui-text-muted)]`} title={event.orderId ?? "-"}>
                        {shortId(event.orderId)}
                      </td>
                      <td className={`${adminTableCellClass} w-[190px] whitespace-nowrap text-[var(--ui-text-secondary)]`}>
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className={`${adminTableCellClass} min-w-[260px]`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[var(--ui-text-secondary)]" title={preview}>
                            {preview}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(event.id)}
                            className={`${actionButtonClass} shrink-0 text-[var(--ui-text-muted)]`}
                          >
                            {expanded ? "Hide" : "View"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className={adminTableRowClass}>
                        <td className={`${adminTableCellClass} bg-[color:var(--surface-alt)]`} colSpan={6}>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-[var(--ui-radius-sm)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-3 font-mono text-[11px] text-[var(--ui-text-secondary)]">
                            {formatMetadataBlock(event.metadata)}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </AdminTable>
        </div>

        {nextCursor ? (
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-4 py-0 text-sm"
              onClick={() => {
                void loadMore();
              }}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading events..." : "Load more"}
            </Button>
          </div>
        ) : null}

        {!loading && !nextCursor && visibleEvents.length > 0 ? (
          <p className="mt-3 text-center text-xs text-[var(--ui-text-muted)]">End of event list.</p>
        ) : null}
      </GlassCard>
    </AdminPage>
  );
}
