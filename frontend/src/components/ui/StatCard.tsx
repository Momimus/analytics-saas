import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
  className?: string;
  loading?: boolean;
};

export default function StatCard({ label, value, icon, hint, className, loading = false }: StatCardProps) {
  return (
    <article
      className={`rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-elevated)] p-3 shadow-[0_6px_16px_rgba(2,8,23,0.18)] backdrop-blur-md transition duration-[var(--ui-motion-normal)] hover:-translate-y-0.5 hover:shadow-[var(--ui-shadow-md)] sm:rounded-[var(--ui-radius-xl)] sm:p-4 sm:shadow-[var(--ui-shadow-sm)] ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs tracking-[0.08em] text-[var(--ui-text-muted)]">{label}</p>
        {icon && <span className="text-[var(--ui-text-secondary)]">{icon}</span>}
      </div>
      {loading ? (
        <div className="mt-1.5 h-7 w-14 animate-pulse rounded bg-[color:var(--surface-strong)]/70" />
      ) : (
        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[var(--ui-text-primary)] sm:text-3xl">{value}</p>
      )}
      {hint && (
        loading
          ? <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-[color:var(--surface-strong)]/60" />
          : <p className="mt-1 text-xs text-[var(--ui-text-secondary)]">{hint}</p>
      )}
    </article>
  );
}
