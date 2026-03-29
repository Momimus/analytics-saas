type InsightItem = {
  title: string;
  value: string;
  note: string;
};

type AnalyticsInsightListProps = {
  items: InsightItem[];
  loading?: boolean;
};

export default function AnalyticsInsightList({ items, loading = false }: AnalyticsInsightListProps) {
  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-4">
            <div className="h-3 w-24 animate-pulse rounded bg-[color:var(--surface-strong)]/60" />
            <div className="mt-3 h-6 w-32 animate-pulse rounded bg-[color:var(--surface-strong)]/70" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-[color:var(--surface-strong)]/50" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <article key={item.title} className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-4 py-4 shadow-[var(--ui-shadow-sm)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">{item.title}</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-[var(--ui-text-primary)]">{item.value}</p>
          <p className="mt-2 text-sm text-[var(--ui-text-secondary)]">{item.note}</p>
        </article>
      ))}
    </div>
  );
}
