import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
  className?: string;
};

export default function StatCard({ label, value, icon, hint, className }: StatCardProps) {
  return (
    <article
      className={`rounded-[var(--ui-radius-xl)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-elevated)] p-4 shadow-[var(--ui-shadow-sm)] backdrop-blur-md transition duration-[var(--ui-motion-normal)] hover:-translate-y-0.5 hover:shadow-[var(--ui-shadow-md)] ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--ui-text-muted)]">{label}</p>
        {icon && <span className="text-[var(--ui-text-secondary)]">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--ui-text-secondary)]">{hint}</p>}
    </article>
  );
}
