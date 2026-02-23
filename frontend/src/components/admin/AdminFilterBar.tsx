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
    <div className="mb-3 rounded-[var(--ui-radius-xl)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-3 shadow-[var(--ui-shadow-sm)] sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2.5">
        <div className="grid gap-1">
          {title ? <p className="text-sm font-semibold text-[var(--ui-text-primary)]">{title}</p> : null}
          {helperText ? <p className="text-xs text-[var(--ui-text-muted)]">{helperText}</p> : null}
        </div>
        <div className="flex items-center gap-1.5">
          {hasFilters ? (
            <span className="inline-flex items-center rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-2 py-0.5 text-xs text-[var(--ui-text-muted)]">
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
      <div className="grid gap-2 md:grid-cols-4">{children}</div>
      {onReset && hasFilters ? (
        <div className="mt-2 flex justify-end">
          <Button type="button" variant="ghost" className="h-8 px-2.5 py-0 text-xs" onClick={onReset}>
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}
