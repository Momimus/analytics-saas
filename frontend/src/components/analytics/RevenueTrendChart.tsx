import { useMemo, useState } from "react";

type TrendPoint = {
  label: string;
  value: number;
};

type RevenueTrendChartProps = {
  data: TrendPoint[];
};

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 640;
  const height = 260;
  const paddingX = 44;
  const paddingTop = 18;
  const paddingBottom = 38;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const minValue = Math.min(...data.map((item) => item.value), 0);
  const valueRange = Math.max(1, maxValue - minValue);

  const points = useMemo(() => data.map((item, index) => {
    const x = paddingX + (index / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + (1 - (item.value - minValue) / valueRange) * chartHeight;
    return { x, y, label: item.label, value: item.value };
  }), [chartWidth, chartHeight, data, minValue, paddingX, paddingTop, valueRange]);

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const activeIndex = hoveredIndex ?? Math.max(points.length - 1, 0);
  const activePoint = points[activeIndex] ?? null;
  const tooltipLeft = activePoint ? (activePoint.x / width) * 100 : 0;
  const tooltipTop = activePoint ? (activePoint.y / height) * 100 : 0;
  const tickStep = Math.max(1, Math.ceil(data.length / 8));
  const previousPoint = activeIndex > 0 ? points[activeIndex - 1] : null;
  const delta = activePoint && previousPoint ? activePoint.value - previousPoint.value : 0;

  return (
    <div className="relative w-full overflow-hidden rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-4">
      {activePoint ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Focused Day</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-text-primary)]">{activePoint.label}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight text-[var(--ui-text-primary)]">${activePoint.value.toLocaleString()}</p>
            <p className={`mt-1 text-xs font-medium ${delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {delta >= 0 ? "+" : ""}{delta.toLocaleString()} vs previous point
            </p>
          </div>
        </div>
      ) : null}

      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full sm:h-64">
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.015" />
          </linearGradient>
        </defs>

        <line x1={paddingX} y1={paddingTop} x2={paddingX} y2={height - paddingBottom} stroke="var(--ui-border-soft)" />
        <line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="var(--ui-border-soft)"
        />

        {Array.from({ length: 5 }).map((_, idx) => {
          const y = paddingTop + (idx / 4) * chartHeight;
          return <line key={idx} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--ui-border-soft)" opacity="0.75" />;
        })}

        <path d={`${path} L${width - paddingX},${height - paddingBottom} L${paddingX},${height - paddingBottom} Z`} fill="url(#rev-fill)" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" />

        {points.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r="3.5" fill="var(--accent)" stroke="white" strokeWidth="1.5" />
        ))}

        {activePoint ? (
          <>
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={height - paddingBottom}
              stroke="var(--accent)"
              strokeDasharray="4 6"
              opacity="0.4"
            />
            <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="white" stroke="var(--accent)" strokeWidth="2.5" />
          </>
        ) : null}

        {points.map((point, index) => (
          index % tickStep === 0 || index === points.length - 1 ? (
            <text
              key={`label-${point.label}-${index}`}
              x={point.x}
              y={height - 12}
              textAnchor="middle"
              fill="var(--ui-text-muted)"
              fontSize="11"
            >
              {point.label}
            </text>
          ) : null
        ))}

        {points.map((point, index) => (
          <rect
            key={`hit-${point.label}`}
            x={point.x - chartWidth / (Math.max(points.length - 1, 1) * 2)}
            y={paddingTop}
            width={chartWidth / Math.max(points.length - 1, 1)}
            height={chartHeight}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onTouchStart={() => setHoveredIndex(index)}
          />
        ))}
      </svg>

      {activePoint ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-2.5 py-1.5 text-xs shadow-[var(--ui-shadow-panel)]"
          style={{ left: `${tooltipLeft}%`, top: `calc(${tooltipTop}% - 12px)` }}
        >
          <p className="font-medium text-[var(--ui-text-primary)]">{activePoint.label}</p>
          <p className="text-[var(--ui-text-muted)]">${activePoint.value.toLocaleString()}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ui-text-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" /> Revenue
        </span>
        <span>Hover or tap the chart to inspect a day.</span>
      </div>
    </div>
  );
}
