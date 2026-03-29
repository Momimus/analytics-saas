import type { ReactNode } from "react";

function toneClasses(delta?: number) {
  if (typeof delta !== "number" || Number.isNaN(delta) || delta === 0) {
    return {
      badge: "border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] text-[var(--ui-text-secondary)]",
      note: "text-[var(--ui-text-muted)]",
      glyph: "•",
    };
  }

  if (delta > 0) {
    return {
      badge: "border-emerald-200/70 bg-emerald-500/10 text-emerald-700",
      note: "text-emerald-700",
      glyph: "?",
    };
  }

  return {
    badge: "border-rose-200/70 bg-rose-500/10 text-rose-700",
    note: "text-rose-700",
    glyph: "?",
  };
}

type AnalyticsMetricCardProps = {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  sublabel?: string;
  icon?: ReactNode;
  loading?: boolean;
};

export default function AnalyticsMetricCard({
  label,
  value,
  delta,
  deltaLabel,
  sublabel,
  icon,
  loading = false,
}: AnalyticsMetricCardProps) {
  const tone = toneClasses(delta);

  return (
    <article className="relative overflow-hidden rounded-[var(--ui-radius-xl)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-5 py-5 shadow-[var(--ui-shadow-panel)]">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent)] opacity-70" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">{label}</p>
          {loading ? (
            <div className="mt-3 h-9 w-28 animate-pulse rounded bg-[color:var(--surface-strong)]/70" />
          ) : (
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{value}</p>
          )}
        </div>
        {icon ? (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] text-[var(--accent)] shadow-[var(--ui-shadow-sm)]">
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {loading ? (
          <div className="h-6 w-24 animate-pulse rounded-full bg-[color:var(--surface-strong)]/60" />
        ) : deltaLabel ? (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}>
            <span>{tone.glyph}</span>
            <span>{deltaLabel}</span>
          </span>
        ) : null}
        {loading ? (
          <div className="h-4 w-20 animate-pulse rounded bg-[color:var(--surface-strong)]/50" />
        ) : sublabel ? (
          <span className={`text-xs font-medium ${tone.note}`}>{sublabel}</span>
        ) : null}
      </div>
    </article>
  );
}
