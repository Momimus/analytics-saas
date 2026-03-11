import { Fragment, useEffect, useMemo, useState } from "react";
import type { AnalyticsActivityEvent } from "../api/adminAnalytics";
import { getActivity } from "../api/adminAnalytics";
import {
  AdminTable,
  adminTableCellClass,
  adminTableHeadCellClass,
  adminTableHeadRowClass,
  adminTableRowClass,
} from "../components/admin/AdminTable";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import Button from "../components/Button";
import Input from "../components/Input";
import Combobox, { type ComboboxOption } from "../components/ui/Combobox";
import GlassCard from "../components/ui/GlassCard";
import type { ApiError } from "../lib/api";

const PAGE_SIZE = 50;
const DEFAULT_RANGE = "30d";

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

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
      setEvents((prev) => {
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

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Events Explorer"
          subtitle="Search and inspect analytics events with cursor-based history."
          compact
          aside={
            <div className="flex items-end gap-2.5">
              <Input
                label="Search events"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by event, id, metadata..."
                className="w-72"
                autoComplete="off"
              />
              <label className="grid w-56 gap-1.5 text-sm font-medium text-[var(--ui-text-muted)]">
                <span className="text-[var(--ui-text-primary)]">Event type</span>
                <Combobox
                  value={eventTypeFilter}
                  onChange={setEventTypeFilter}
                  options={eventTypeOptions}
                  placeholder="All events"
                  ariaLabel="Filter by event type"
                />
              </label>
            </div>
          }
        />

        <AdminTable
          loading={loading}
          error={error}
          errorStatusCode={errorStatusCode}
          errorDetails={errorDetails}
          onRetry={() => setRefreshKey((prev) => prev + 1)}
          hasRows={visibleEvents.length > 0}
          emptyMessage="No events found."
          colCount={6}
          stickyHeader
          zebraRows
          density="comfortable"
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
