import { useState } from "react";

type ProductPerformancePoint = {
  label: string;
  orders: number;
  events: number;
};

type ProductPerformanceChartProps = {
  data: ProductPerformancePoint[];
};

export default function ProductPerformanceChart({ data }: ProductPerformanceChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 640;
  const height = 260;
  const paddingX = 34;
  const paddingTop = 20;
  const paddingBottom = 46;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;
  const maxValue = Math.max(...data.map((item) => Math.max(item.orders, item.events)), 1);
  const slot = chartWidth / Math.max(data.length, 1);
  const barWidth = Math.max(18, Math.min(40, slot * 0.28));
  const tickStep = Math.max(1, Math.ceil(data.length / 6));
  const activeIndex = hoveredIndex ?? Math.max(data.length - 1, 0);
  const activePoint = data[activeIndex] ?? null;

  return (
    <div className="relative overflow-hidden rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-4">
      {activePoint ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Focused Product</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-text-primary)]">{activePoint.label}</p>
          </div>
          <div className="text-right text-sm text-[var(--ui-text-secondary)]">
            <p><span className="font-semibold text-[var(--ui-text-primary)]">{activePoint.orders}</span> orders</p>
            <p><span className="font-semibold text-[var(--ui-text-primary)]">{activePoint.events}</span> events</p>
          </div>
        </div>
      ) : null}

      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full sm:h-64">
        <line x1={paddingX} y1={paddingTop} x2={paddingX} y2={height - paddingBottom} stroke="var(--ui-border-soft)" />
        <line x1={paddingX} y1={height - paddingBottom} x2={width - paddingX} y2={height - paddingBottom} stroke="var(--ui-border-soft)" />

        {Array.from({ length: 5 }).map((_, idx) => {
          const y = paddingTop + (idx / 4) * chartHeight;
          return (
            <line
              key={idx}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="var(--ui-border-soft)"
              opacity="0.7"
            />
          );
        })}

        {data.map((point, index) => {
          const groupX = paddingX + index * slot + (slot - barWidth * 2 - 6) / 2;
          const ordersHeight = (point.orders / maxValue) * chartHeight;
          const eventsHeight = (point.events / maxValue) * chartHeight;
          const label = point.label.length > 10 ? `${point.label.slice(0, 10)}…` : point.label;
          const isActive = activeIndex === index;

          return (
            <g key={point.label}>
              <rect
                x={groupX}
                y={height - paddingBottom - ordersHeight}
                width={barWidth}
                height={ordersHeight}
                rx="6"
                fill="var(--accent)"
                fillOpacity={isActive ? 0.96 : 0.88}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={() => setHoveredIndex(index)}
              />
              <rect
                x={groupX + barWidth + 6}
                y={height - paddingBottom - eventsHeight}
                width={barWidth}
                height={eventsHeight}
                rx="6"
                fill="var(--accent)"
                fillOpacity={isActive ? 0.42 : 0.28}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={() => setHoveredIndex(index)}
              />
              {(index % tickStep === 0 || index === data.length - 1) ? (
                <text x={groupX + barWidth + 3} y={height - 14} textAnchor="middle" fill="var(--ui-text-muted)" fontSize="11">
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--ui-text-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" /> Orders
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]/35" /> Events
        </span>
        <span className="sm:ml-auto">Hover or tap a product pair for detail.</span>
      </div>
    </div>
  );
}
