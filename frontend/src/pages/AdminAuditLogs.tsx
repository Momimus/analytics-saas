import { useEffect, useState } from "react";
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
import Input from "../components/Input";
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

  return (
    <AdminPage>
      <GlassCard>
        <AdminPageHeader
          title="Audit Logs"
          subtitle="Workspace-scoped admin activity trail."
          compact
          aside={
            <div className="flex items-end gap-2.5">
              <Input
                label="Action"
                value={action}
                onChange={(event) => {
                  setPage(1);
                  setAction(event.target.value);
                }}
                placeholder="order.created"
                className="w-56"
              />
              <Input
                label="Entity type"
                value={entityType}
                onChange={(event) => {
                  setPage(1);
                  setEntityType(event.target.value);
                }}
                placeholder="order"
                className="w-48"
              />
            </div>
          }
        />

        <AdminTable
          loading={loading}
          error={error}
          errorStatusCode={errorStatusCode}
          errorDetails={errorDetails}
          onRetry={() => setRefreshKey((current) => current + 1)}
          hasRows={logs.length > 0}
          emptyMessage="No audit logs found."
          colCount={5}
          stickyHeader
          zebraRows
          density="comfortable"
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
                      {log.entityId.slice(-8)}
                    </div>
                  ) : null}
                </td>
                <td className={adminTableCellClass}>
                  <div>{log.actorRole ?? "System"}</div>
                  {log.actorId ? (
                    <div className="font-mono text-xs text-[var(--ui-text-muted)]" title={log.actorId}>
                      {log.actorId.slice(-8)}
                    </div>
                  ) : null}
                </td>
                <td className={`${adminTableCellClass} font-mono text-xs text-[var(--ui-text-muted)]`} title={log.id}>
                  {log.id.slice(-8)}
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
          onPageSizeChange={(size) => {
            setPage(1);
            setPageSize(size);
          }}
        />
      </GlassCard>
    </AdminPage>
  );
}
