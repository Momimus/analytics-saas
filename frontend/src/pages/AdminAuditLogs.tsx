import { useEffect, useMemo, useState } from "react";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import { AdminPage, AdminPageHeader } from "../components/admin/AdminPageLayout";
import {
  AdminPagination,
  AdminTable,
  adminTableCellClass,
  adminTableHeadCellClass,
  adminTableHeadRowClass,
  adminTableRowClass,
} from "../components/admin/AdminTable";
import GlassCard from "../components/ui/GlassCard";
import { listAdminAuditLogs, type AuditLogListItem } from "../lib/admin";
import type { ApiError } from "../lib/api";

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

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setErrorStatusCode(undefined);
    setErrorDetails(undefined);

    listAdminAuditLogs({ page, pageSize, action, entityType })
      .then((result) => {
        if (!active) return;
        setLogs(result.logs);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const apiErr = err as ApiError;
        setError(err instanceof Error ? err.message : "Failed to load audit logs");
        setErrorStatusCode(typeof apiErr?.status === "number" ? apiErr.status : undefined);
        setErrorDetails(typeof apiErr?.code === "string" ? apiErr.code : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, pageSize, action, entityType, refreshKey]);

  const activeFilterCount = (action.trim() ? 1 : 0) + (entityType.trim() ? 1 : 0);
  const systemEntries = useMemo(() => logs.filter((log) => !log.actorId).length, [logs]);

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader title="Audit Logs" subtitle="Workspace-scoped admin activity trail." compact />

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Visible Entries</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{logs.length}</p>
          </div>
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-accent-soft)]/35 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">System Entries</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{systemEntries}</p>
          </div>
          <div className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Page</p>
            <p className="mt-1 text-sm font-medium text-[var(--ui-text-primary)]">{page} of {totalPages || 1}</p>
          </div>
        </div>

        <div className="mt-4">
          <AdminFilterBar
            title="Audit Filters"
            helper="Search the activity trail by action or affected entity type for the current workspace."
            activeFilterCount={activeFilterCount}
            onReset={activeFilterCount > 0 ? () => {
              setPage(1);
              setAction("");
              setEntityType("");
            } : undefined}
          >
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ui-text-primary)]">Action</span>
              <input
                value={action}
                onChange={(event) => {
                  setPage(1);
                  setAction(event.target.value);
                }}
                placeholder="order.created"
                className="h-10 w-full rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3 text-sm text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] outline-none transition focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent-soft)]"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ui-text-primary)]">Entity type</span>
              <input
                value={entityType}
                onChange={(event) => {
                  setPage(1);
                  setEntityType(event.target.value);
                }}
                placeholder="order"
                className="h-10 w-full rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3 text-sm text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] outline-none transition focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent-soft)]"
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
            onRetry={() => setRefreshKey((current) => current + 1)}
            hasRows={logs.length > 0}
            emptyMessage={activeFilterCount > 0 ? "No audit entries match the current filters." : "No audit logs found for this workspace."}
            colCount={5}
            stickyHeader
            zebraRows
            density="comfortable"
            responsiveMode="stack"
            mobileStack={
              <div className="grid gap-3">
                {logs.map((log) => (
                  <article key={log.id} className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-4 shadow-[var(--ui-shadow-sm)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--ui-text-primary)]">{log.action}</p>
                        <p className="mt-1 text-sm text-[var(--ui-text-secondary)]">{formatDateTime(log.createdAt)}</p>
                      </div>
                      <span className="rounded border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--ui-text-muted)]">
                        {log.entityType}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Actor</p>
                        <p className="mt-1 text-[var(--ui-text-primary)]">{log.actorRole ?? "System"}</p>
                        {log.actorId ? <p className="mt-1 font-mono text-xs text-[var(--ui-text-muted)]">{shortId(log.actorId)}</p> : null}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Entity ID</p>
                        <p className="mt-1 font-mono text-xs text-[var(--ui-text-primary)]">{shortId(log.entityId)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Log ID</p>
                        <p className="mt-1 font-mono text-xs text-[var(--ui-text-muted)] break-all">{log.id}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            }
          >
            <thead>
              <tr className={adminTableHeadRowClass}>
                <th className={adminTableHeadCellClass}>Timestamp</th>
                <th className={adminTableHeadCellClass}>Action</th>
                <th className={adminTableHeadCellClass}>Entity</th>
                <th className={adminTableHeadCellClass}>Actor</th>
                <th className={adminTableHeadCellClass}>ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className={adminTableRowClass}>
                  <td className={`${adminTableCellClass} whitespace-nowrap text-[var(--ui-text-secondary)]`}>
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className={`${adminTableCellClass} font-medium`}>{log.action}</td>
                  <td className={adminTableCellClass}>
                    <div>{log.entityType}</div>
                    {log.entityId ? (
                      <div className="font-mono text-xs text-[var(--ui-text-muted)]" title={log.entityId}>
                        {shortId(log.entityId)}
                      </div>
                    ) : null}
                  </td>
                  <td className={adminTableCellClass}>
                    <div>{log.actorRole ?? "System"}</div>
                    {log.actorId ? (
                      <div className="font-mono text-xs text-[var(--ui-text-muted)]" title={log.actorId}>
                        {shortId(log.actorId)}
                      </div>
                    ) : null}
                  </td>
                  <td className={`${adminTableCellClass} font-mono text-xs text-[var(--ui-text-muted)]`} title={log.id}>
                    {shortId(log.id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </div>

        <div className="mt-4">
          <AdminPagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPage(1);
              setPageSize(size);
            }}
          />
        </div>
      </GlassCard>
    </AdminPage>
  );
}
