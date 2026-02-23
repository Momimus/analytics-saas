type CategoryPoint = {
  label: string;
  value: number;
};

type OrdersCategoryChartProps = {
  data: CategoryPoint[];
};

const BAR_COLORS = [
  "var(--accent)",
  "color-mix(in srgb, var(--accent) 74%, #ffffff 26%)",
  "color-mix(in srgb, var(--accent) 56%, #ffffff 44%)",
  "color-mix(in srgb, var(--accent) 42%, #ffffff 58%)",
];

export default function OrdersCategoryChart({ data }: OrdersCategoryChartProps) {
  const width = 640;
  const height = 260;
  const paddingX = 42;
  const paddingTop = 16;
  const paddingBottom = 40;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const barSlot = chartWidth / Math.max(data.length, 1);
  const barWidth = Math.max(18, Math.min(44, barSlot * 0.55));

  return (
    <div className="w-full overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/20 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        <line x1={paddingX} y1={paddingTop} x2={paddingX} y2={height - paddingBottom} stroke="var(--border)" />
        <line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="var(--border)"
        />

        {Array.from({ length: 4 }).map((_, idx) => {
          const y = paddingTop + (idx / 3) * chartHeight;
          return <line key={idx} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--border)" opacity="0.35" />;
        })}

        {data.map((point, index) => {
          const x = paddingX + index * barSlot + (barSlot - barWidth) / 2;
          const barHeight = (point.value / maxValue) * chartHeight;
          const y = height - paddingBottom - barHeight;
          return (
            <g key={point.label}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="6" fill={BAR_COLORS[index % BAR_COLORS.length]} />
              <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" fill="var(--text-muted)" fontSize="11">
                {point.label}
              </text>
              <text x={x + barWidth / 2} y={Math.max(12, y - 6)} textAnchor="middle" fill="var(--text)" fontSize="11">
                {point.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
