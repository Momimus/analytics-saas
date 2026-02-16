import { useCallback, useEffect, useState } from "react";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import type { AuditLog } from "../lib/admin";
import { listAdminAuditLogs } from "../lib/admin";
import AdminSectionNav from "../components/admin/AdminSectionNav";
import { AdminPagination, AdminTable } from "../components/admin/AdminTable";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      .then(() => setError(null))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [action, entityType, actorId, dateFrom, dateTo, pageSize]);

  return (
    <div className="grid gap-6">
      <AdminSectionNav />

      <GlassCard title="Audit Logs" subtitle="Filter and inspect admin activity.">
        <div className="mb-3 grid gap-2 md:grid-cols-3 lg:grid-cols-6">
          <input
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="Action"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <input
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            placeholder="Entity type"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <input
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            placeholder="Actor id"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <Button type="button" className="h-10 px-4 py-0" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        <AdminTable loading={loading} error={error} hasRows={logs.length > 0} emptyMessage="No logs found." colCount={5}>
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
                  <Button type="button" variant="ghost" className="h-10 px-3 py-0" onClick={() => setSelectedLog(log)}>
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold text-[var(--text)]">Audit Event</h2>
            <pre className="mt-3 max-h-[60vh] overflow-auto rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-3 text-xs text-[var(--text-muted)]">
              {JSON.stringify(selectedLog.metadata, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end">
              <Button type="button" className="h-10 px-4 py-0" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
