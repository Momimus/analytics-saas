type TrendPoint = {
  label: string;
  value: number;
};

type RevenueTrendChartProps = {
  data: TrendPoint[];
};

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const width = 640;
  const height = 260;
  const paddingX = 42;
  const paddingTop = 16;
  const paddingBottom = 36;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  const points = data.map((item, index) => {
    const x = paddingX + (index / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + (1 - item.value / maxValue) * chartHeight;
    return { x, y, label: item.label, value: item.value };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");

  return (
    <div className="w-full overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/20 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

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

        <path d={`${path} L${width - paddingX},${height - paddingBottom} L${paddingX},${height - paddingBottom} Z`} fill="url(#rev-fill)" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" />

        {points.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r="3.5" fill="var(--accent)" />
        ))}

        {points.map((point) => (
          <text key={`label-${point.label}`} x={point.x} y={height - 12} textAnchor="middle" fill="var(--text-muted)" fontSize="11">
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
