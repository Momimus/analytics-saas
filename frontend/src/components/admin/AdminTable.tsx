import type { PropsWithChildren, ReactNode } from "react";
import Button from "../Button";

type AdminTableProps = PropsWithChildren<{
  loading: boolean;
  error?: string | null;
  emptyMessage: string;
  hasRows: boolean;
  colCount: number;
}>;

export function AdminTable({ loading, error, emptyMessage, hasRows, colCount, children }: AdminTableProps) {
  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading...</p>;
  }
  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }
  if (!hasRows) {
    return <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        {children}
        <tfoot>
          <tr>
            <td className="h-0 p-0" colSpan={colCount} />
          </tr>
        </tfoot>
      </table>
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
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border)] pt-3">
      <p className="text-xs text-[var(--text-muted)]">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-10 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-2 text-sm text-[var(--text)]"
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3 py-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>
        <span className="text-xs text-[var(--text-muted)]">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3 py-0"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
      {rightSlot}
    </div>
  );
}
