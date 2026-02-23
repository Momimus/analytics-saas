import { useCallback, useEffect, useState } from "react";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import type { AuditLog } from "../lib/admin";
import { listAdminAuditLogs } from "../lib/admin";
import { AdminPagination, AdminTable } from "../components/admin/AdminTable";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import { ApiError } from "../lib/api";
import Dialog from "../components/ui/Dialog";
import Select from "../components/ui/Select";
import DateInput from "../components/ui/DateInput";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return null;
}

function formatValue(value: unknown) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>(undefined);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorId, setActorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const activeFilters = [
    ...(action.trim() ? [{ key: "action", label: "Action", value: action.trim(), onRemove: () => setAction("") }] : []),
    ...(entityType.trim() ? [{ key: "entity", label: "Target", value: entityType.trim(), onRemove: () => setEntityType("") }] : []),
    ...(actorId.trim() ? [{ key: "actor", label: "Actor", value: actorId.trim(), onRemove: () => setActorId("") }] : []),
    ...(dateFrom ? [{ key: "from", label: "From", value: dateFrom, onRemove: () => setDateFrom("") }] : []),
    ...(dateTo ? [{ key: "to", label: "To", value: dateTo, onRemove: () => setDateTo("") }] : []),
  ];

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (action.trim()) params.set("action", action.trim());
    if (entityType.trim()) params.set("entityType", entityType.trim());
    if (actorId.trim()) params.set("actorId", actorId.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const result = await listAdminAuditLogs(params);
    setLogs(result.logs);
    setTotal(result.total);
    setTotalPages(result.totalPages);
  }, [action, actorId, dateFrom, dateTo, entityType, page, pageSize]);

  useEffect(() => {
    setLoading(true);
    load()
      .then(() => {
        setError(null);
        setErrorStatusCode(undefined);
        setErrorDetails(undefined);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
          setErrorStatusCode(err.status);
          setErrorDetails(err.code);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load audit logs");
          setErrorStatusCode(undefined);
          setErrorDetails(undefined);
        }
      })
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [action, entityType, actorId, dateFrom, dateTo, pageSize]);

  const copyValue = async (label: string, value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyNotice(`${label} copied`);
      window.setTimeout(() => setCopyNotice(null), 1200);
    } catch {
      setCopyNotice("Copy failed");
      window.setTimeout(() => setCopyNotice(null), 1200);
    }
  };

  const actionOptions = Array.from(new Set(logs.map((log) => log.action))).sort();
  const entityOptions = Array.from(new Set(logs.map((log) => log.entityType))).sort();

  const selectedMetadata = asRecord(selectedLog?.metadata ?? null);
  const beforeValue = selectedMetadata?.before;
  const afterValue = selectedMetadata?.after;
  const beforeRecord = asRecord(beforeValue);
  const afterRecord = asRecord(afterValue);
  const diffKeys =
    beforeRecord || afterRecord
      ? Array.from(new Set([...Object.keys(beforeRecord ?? {}), ...Object.keys(afterRecord ?? {})])).sort()
      : [];
  const requestId = typeof selectedMetadata?.requestId === "string" ? selectedMetadata.requestId : null;
  const traceId = typeof selectedMetadata?.traceId === "string" ? selectedMetadata.traceId : null;

  return (
    <div className="grid gap-5">
      <GlassCard title="Audit Logs" subtitle="Filter and inspect admin activity.">
        <AdminFilterBar
          title="Audit Filters"
          helper="Narrow audit history by actor, target, and action windows."
          activeFilterCount={activeFilters.length}
          hint="Quick filters: action, actor, target type, and date range."
          onReset={() => {
            setAction("");
            setEntityType("");
            setActorId("");
            setDateFrom("");
            setDateTo("");
          }}
          rightSlot={
            <Button type="button" className="h-9 px-3 py-0 text-xs" onClick={() => void load()}>
              Refresh
            </Button>
          }
        >
          <Select
            value={action}
            onChange={setAction}
            ariaLabel="Filter audit logs by action"
            items={[{ label: "All actions", value: "" }, ...actionOptions.map((item) => ({ label: item, value: item }))]}
          />
          <Select
            value={entityType}
            onChange={setEntityType}
            ariaLabel="Filter audit logs by target type"
            items={[{ label: "All targets", value: "" }, ...entityOptions.map((item) => ({ label: item, value: item }))]}
          />
          <input
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            placeholder="Actor id"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <DateInput value={dateFrom} onChange={setDateFrom} placeholder="From date" ariaLabel="Audit logs from date" />
          <DateInput value={dateTo} onChange={setDateTo} placeholder="To date" ariaLabel="Audit logs to date" />
          <div />
        </AdminFilterBar>
        {copyNotice && <p className="mb-3 text-xs text-emerald-300">{copyNotice}</p>}

        <AdminTable
          loading={loading}
          error={error}
          errorStatusCode={errorStatusCode}
          errorDetails={errorDetails}
          onRetry={() => void load()}
          stickyHeader
          zebraRows
          appliedFilters={activeFilters}
          onClearFilters={() => {
            setAction("");
            setEntityType("");
            setActorId("");
            setDateFrom("");
            setDateTo("");
          }}
          hasRows={logs.length > 0}
          emptyMessage="No logs match your current filters."
          colCount={5}
          emptyAction={
            <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" onClick={() => void load()}>
              Reload Logs
            </Button>
          }
        >
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-[color:var(--border)] text-[var(--text)]">
                <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{log.action}</td>
                <td className="px-3 py-2">{log.entityType}{log.entityId ? `:${log.entityId}` : ""}</td>
                <td className="px-3 py-2">{log.actorId ?? "system"}</td>
                <td className="px-3 py-2">
                  <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" onClick={() => setSelectedLog(log)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>

        <AdminPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </GlassCard>

      {selectedLog && (
        <Dialog open={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} className="max-w-2xl">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Audit Event Detail</h2>
            <div className="mt-3 grid gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/40 p-3 text-sm text-[var(--text-muted)]">
              <p><span className="text-[var(--text)]">When:</span> {new Date(selectedLog.createdAt).toLocaleString()}</p>
              <p><span className="text-[var(--text)]">What:</span> {selectedLog.action}</p>
              <p><span className="text-[var(--text)]">Target:</span> {selectedLog.entityType}{selectedLog.entityId ? `:${selectedLog.entityId}` : ""}</p>
              <p><span className="text-[var(--text)]">Who:</span> {selectedLog.actorId ?? "system"} ({selectedLog.actorRole ?? "unknown"})</p>
              <p><span className="text-[var(--text)]">Why:</span> {selectedMetadata?.reason ? String(selectedMetadata.reason) : "No explicit reason provided"}</p>
              <p><span className="text-[var(--text)]">Network:</span> {selectedLog.ip ?? "N/A"}{selectedLog.userAgent ? ` | ${selectedLog.userAgent}` : ""}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" onClick={() => void copyValue("Log id", selectedLog.id)}>
                Copy Log ID
              </Button>
              <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" disabled={!selectedLog.actorId} onClick={() => void copyValue("Actor id", selectedLog.actorId)}>
                Copy Actor ID
              </Button>
              <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" disabled={!selectedLog.entityId} onClick={() => void copyValue("Target id", selectedLog.entityId)}>
                Copy Target ID
              </Button>
              <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" disabled={!requestId} onClick={() => void copyValue("Request id", requestId)}>
                Copy Request ID
              </Button>
              <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" disabled={!traceId} onClick={() => void copyValue("Trace id", traceId)}>
                Copy Trace ID
              </Button>
            </div>

            {beforeValue !== undefined || afterValue !== undefined ? (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Change Detail</p>
                {diffKeys.length > 0 ? (
                  <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[color:var(--border)]">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[color:var(--surface-strong)] text-[var(--text-muted)]">
                          <th className="px-3 py-2">Field</th>
                          <th className="px-3 py-2">Before</th>
                          <th className="px-3 py-2">After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffKeys.map((key) => (
                          <tr key={key} className="border-t border-[color:var(--border)] align-top text-[var(--text)]">
                            <td className="px-3 py-2 font-medium">{key}</td>
                            <td className="px-3 py-2 whitespace-pre-wrap">{formatValue(beforeRecord?.[key])}</td>
                            <td className="px-3 py-2 whitespace-pre-wrap">{formatValue(afterRecord?.[key])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Before</p>
                      <pre className="max-h-[40vh] overflow-auto rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-3 text-xs text-[var(--text-muted)]">
                        {JSON.stringify(beforeValue ?? {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">After</p>
                      <pre className="max-h-[40vh] overflow-auto rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-3 text-xs text-[var(--text-muted)]">
                        {JSON.stringify(afterValue ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Metadata JSON</p>
            <pre className="mt-2 max-h-[40vh] overflow-auto rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-3 text-xs text-[var(--text-muted)]">
              {JSON.stringify(selectedLog.metadata, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end">
              <Button type="button" className="h-9 px-3 py-0 text-xs" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

