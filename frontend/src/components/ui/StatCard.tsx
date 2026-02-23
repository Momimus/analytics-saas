import type { ReactNode } from "react";
import { cardShellClass } from "../../lib/uiClasses";

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
  className?: string;
  loading?: boolean;
};

export default function StatCard({ label, value, icon, hint, className, loading = false }: StatCardProps) {
  const hintToneClass = hint?.trim().startsWith("+")
    ? "text-[var(--success)]"
    : hint?.trim().startsWith("-")
      ? "text-[var(--danger)]"
      : "text-[var(--ui-text-secondary)]";

  return (
    <article
      className={`${cardShellClass} ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ui-text-muted)]">{label}</p>
        {icon && <span className="text-[var(--ui-text-secondary)]">{icon}</span>}
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-14 animate-pulse rounded bg-[color:var(--surface-strong)]/70" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ui-text-primary)] sm:text-[2rem]">{value}</p>
      )}
      {hint && (
        loading
          ? <div className="mt-2 h-3 w-20 animate-pulse rounded bg-[color:var(--surface-strong)]/60" />
          : <p className={`mt-1.5 text-xs font-medium ${hintToneClass}`}>{hint}</p>
      )}
    </article>
  );
}
