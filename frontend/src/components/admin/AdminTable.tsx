import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import Button from "../Button";
import InlineErrorState from "../common/InlineErrorState";
import Select from "../ui/Select";

export const adminTableHeadRowClass = "text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ui-text-muted)]";
export const adminTableHeadCellClass = "px-3 py-2.5 text-left";
export const adminTableRowClass = "border-t border-[color:var(--ui-border-soft)] text-[var(--ui-text-primary)]";
export const adminTableCellClass = "px-3 py-2.5 align-middle text-sm";

export type AppliedFilter = {
  key: string;
  label: string;
  value: string;
  onRemove?: () => void;
};

type AdminTableProps = PropsWithChildren<{
  loading: boolean;
  error?: string | null;
  errorStatusCode?: number;
  errorDetails?: string;
  onRetry?: () => void;
  emptyMessage: string;
  hasRows: boolean;
  colCount: number;
  skeletonRows?: number;
  emptyAction?: ReactNode;
  stickyHeader?: boolean;
  density?: "comfortable" | "compact";
  zebraRows?: boolean;
  responsiveMode?: "table" | "stack";
  mobileStack?: ReactNode;
  appliedFilters?: AppliedFilter[];
  onClearFilters?: () => void;
}>;

function TableSkeleton({ colCount, rows }: { colCount: number; rows: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="border-t border-[color:var(--border)]">
              {Array.from({ length: colCount }).map((__, cellIndex) => (
                <td key={`${index}-${cellIndex}`} className="px-2.5 py-2">
                  <div className="h-3.5 animate-pulse rounded bg-[color:var(--surface-strong)]/70" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--border)] bg-[color:var(--surface)]/40 p-3">
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
      {action ? <div className="mt-2.5">{action}</div> : null}
    </div>
  );
}

export function AdminTable({
  loading,
  error,
  errorStatusCode,
  errorDetails,
  onRetry,
  emptyMessage,
  hasRows,
  colCount,
  skeletonRows = 6,
  emptyAction,
  stickyHeader = false,
  density = "comfortable",
  zebraRows = false,
  responsiveMode = "table",
  mobileStack,
  appliedFilters,
  onClearFilters,
  children,
}: AdminTableProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showStickyShadow, setShowStickyShadow] = useState(false);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrap = tableWrapRef.current;
    if (!wrap || !stickyHeader) {
      setShowStickyShadow(false);
      return;
    }

    const onScroll = () => {
      setShowStickyShadow(wrap.scrollTop > 2);
    };

    onScroll();
    wrap.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      wrap.removeEventListener("scroll", onScroll);
    };
  }, [stickyHeader, hasRows]);

  useEffect(() => {
    const wrap = tableWrapRef.current;
    if (!wrap) return;
    const rows = wrap.querySelectorAll<HTMLTableRowElement>("tbody tr");
    rows.forEach((row, index) => {
      const rowId = row.dataset.rowId ?? String(index);
      row.dataset.rowSelected = selectedRowId === rowId ? "true" : "false";
      row.dataset.rowKey = rowId;
    });
  }, [children, selectedRowId]);

  useEffect(() => {
    const wrap = tableWrapRef.current;
    if (!wrap) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const row = target.closest("tbody tr") as HTMLTableRowElement | null;
      if (!row) return;
      const rowId = row.dataset.rowId ?? row.dataset.rowKey ?? String(row.sectionRowIndex);
      setSelectedRowId((prev) => (prev === rowId ? null : rowId));
    };
    wrap.addEventListener("click", onClick);
    return () => {
      wrap.removeEventListener("click", onClick);
    };
  }, []);

  if (loading) {
    return <TableSkeleton colCount={colCount} rows={skeletonRows} />;
  }
  if (error) {
    return (
      <InlineErrorState
        title="Unable to load table data"
        message={error}
        statusCode={errorStatusCode}
        details={errorDetails}
        onRetry={onRetry}
      />
    );
  }
  if (!hasRows) {
    return <EmptyState message={emptyMessage} action={emptyAction} />;
  }

  const hasAppliedFilters = Boolean(appliedFilters && appliedFilters.length > 0);
  const tableClassName = [
    "min-w-full text-left text-sm",
    "[&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5",
    stickyHeader
      ? "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[1] [&_thead_th]:bg-[color:var(--surface-alt)]/95 [&_thead_th]:backdrop-blur"
      : "",
    density === "compact"
      ? "[&_th]:!px-2 [&_th]:!py-2 [&_td]:!px-2 [&_td]:!py-2"
      : "",
    "[&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.1em] [&_thead_th]:text-[var(--ui-text-muted)]",
    "[&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150",
    "[&_tbody_tr:hover]:bg-[color:var(--surface-alt)]",
    "[&_tbody_tr[data-row-selected='true']]:bg-[color:var(--ui-accent-soft)]/70",
    zebraRows ? "[&_tbody_tr:nth-child(even)]:bg-[color:var(--surface-alt)]/55" : "",
    "[&_th[data-align='right']]:text-right [&_td[data-align='right']]:text-right [&_td[data-align='right']]:tabular-nums",
    "[&_th[data-align='center']]:text-center [&_td[data-align='center']]:text-center",
  ]
    .filter(Boolean)
    .join(" ");

  const tableSurface = (
    <div
      ref={tableWrapRef}
      className={`overflow-x-auto rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] ${
        stickyHeader && showStickyShadow ? "shadow-[inset_0_-1px_0_rgba(226,232,240,0.8),inset_0_10px_14px_-12px_rgba(15,23,42,0.12)]" : ""
      }`}
    >
      <table className={tableClassName}>
        {children}
        <tfoot>
          <tr>
            <td className="h-0 p-0" colSpan={colCount} />
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="grid gap-3">
      {hasAppliedFilters ? (
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/35 p-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Applied filters</span>
            {appliedFilters?.map((filterItem) => (
              <span
                key={filterItem.key}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-2 py-0.5 text-xs text-[var(--text)] transition-colors duration-150 hover:bg-[color:var(--surface)]"
              >
                <span className="text-[var(--text-muted)]">{filterItem.label}:</span>
                <span>{filterItem.value}</span>
                <button
                  type="button"
                  aria-label={`Remove ${filterItem.label} filter`}
                  className="ml-1 rounded-full px-1 text-[var(--text-muted)] transition-colors duration-150 hover:bg-[color:var(--surface-strong)] hover:text-[var(--text)]"
                  onClick={() => filterItem.onRemove?.()}
                >
                  ×
                </button>
              </span>
            ))}
            {onClearFilters ? (
              <Button type="button" variant="ghost" className="ml-auto h-7 px-2.5 py-0 text-xs" onClick={onClearFilters}>
                Clear all
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      {responsiveMode === "stack" && mobileStack ? (
        <>
          <div className="sm:hidden">{mobileStack}</div>
          <div className="hidden sm:block">{tableSurface}</div>
        </>
      ) : (
        tableSurface
      )}
    </div>
  );
}

type AdminPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (next: number) => void;
  onPageSizeChange: (size: number) => void;
  rightSlot?: ReactNode;
};

export function AdminPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  rightSlot,
}: AdminPaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/25 px-2.5 py-1.5">
      <p className="min-w-0 basis-full text-xs text-[var(--text-muted)] sm:basis-auto sm:shrink-0">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        <div className="w-16 shrink-0 sm:w-20">
          <Select
            value={String(pageSize)}
            onChange={(next) => onPageSizeChange(Number(next))}
            ariaLabel="Rows per page"
            className="w-full"
            items={[
              { label: "20", value: "20" },
              { label: "50", value: "50" },
              { label: "100", value: "100" },
            ]}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-9 shrink-0 px-2.5 py-0 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>
        <span className="min-w-0 text-xs text-[var(--text-muted)]">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="h-9 shrink-0 px-2.5 py-0 text-xs"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
      {rightSlot ? <div className="w-full sm:w-auto sm:shrink-0">{rightSlot}</div> : null}
    </div>
  );
}


