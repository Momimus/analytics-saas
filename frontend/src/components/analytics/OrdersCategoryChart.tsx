import { useState } from "react";

type CategoryPoint = {
  label: string;
  value: number;
};

type OrdersCategoryChartProps = {
  data: CategoryPoint[];
};

export default function OrdersCategoryChart({ data }: OrdersCategoryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 640;
  const height = 260;
  const paddingX = 44;
  const paddingTop = 18;
  const paddingBottom = 40;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const barSlot = chartWidth / Math.max(data.length, 1);
  const barWidth = Math.max(18, Math.min(44, barSlot * 0.55));

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;
  const tooltipX = hoveredIndex !== null ? paddingX + hoveredIndex * barSlot + barWidth / 2 + (barSlot - barWidth) / 2 : 0;
  const tooltipY = hoveredIndex !== null && hoveredPoint
    ? height - paddingBottom - ((hoveredPoint.value / maxValue) * chartHeight)
    : 0;
  const tickStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="relative w-full overflow-hidden rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
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

        {data.map((point, index) => {
          const x = paddingX + index * barSlot + (barSlot - barWidth) / 2;
          const barHeight = (point.value / maxValue) * chartHeight;
          const y = height - paddingBottom - barHeight;
          const isHovered = hoveredIndex === index;
          return (
            <g key={point.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="6"
                fill="var(--accent)"
                fillOpacity={isHovered ? 0.95 : 0.84 - index * 0.1}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {index % tickStep === 0 || index === data.length - 1 ? (
                <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" fill="var(--ui-text-muted)" fontSize="11">
                  {point.label}
                </text>
              ) : null}
              <text x={x + barWidth / 2} y={Math.max(12, y - 6)} textAnchor="middle" fill="var(--ui-text-primary)" fontSize="11">
                {point.value}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredPoint ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-2.5 py-1.5 text-xs shadow-[var(--ui-shadow-panel)]"
          style={{ left: `${(tooltipX / width) * 100}%`, top: `calc(${(tooltipY / height) * 100}% - 14px)` }}
        >
          <p className="font-medium text-[var(--ui-text-primary)]">{hoveredPoint.label}</p>
          <p className="text-[var(--ui-text-muted)]">{hoveredPoint.value} orders</p>
        </div>
      ) : null}
    </div>
  );
}
