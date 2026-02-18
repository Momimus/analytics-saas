import type { PropsWithChildren, ReactNode } from "react";
import Button from "../Button";

type AdminFilterBarProps = PropsWithChildren<{
  title?: string;
  helper?: string;
  hint?: string;
  activeFilterCount?: number;
  onReset?: () => void;
  rightSlot?: ReactNode;
}>;

export default function AdminFilterBar({
  title,
  helper,
  hint,
  activeFilterCount = 0,
  onReset,
  rightSlot,
  children,
}: AdminFilterBarProps) {
  const helperText = helper ?? hint;
  const hasFilters = activeFilterCount > 0;

  return (
    <div className="mb-2.5 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)]/50 p-2.5 shadow-[var(--shadow-card)]">
      <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2.5">
        <div className="grid gap-1">
          {title ? <p className="text-sm font-semibold text-[var(--text)]">{title}</p> : null}
          {helperText ? <p className="text-xs text-[var(--text-muted)]">{helperText}</p> : null}
        </div>
        <div className="flex items-center gap-1.5">
          {hasFilters ? (
            <span className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
              {activeFilterCount} active
            </span>
          ) : null}
          {rightSlot}
          {onReset ? (
            <Button type="button" variant="ghost" className="h-9 px-2.5 py-0 text-xs" onClick={onReset}>
              Reset filters
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-1.5 md:grid-cols-4">{children}</div>
      {onReset && hasFilters ? (
        <div className="mt-1.5 flex justify-end">
          <Button type="button" variant="ghost" className="h-8 px-2.5 py-0 text-xs" onClick={onReset}>
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}
