import { TrendPoint } from "@/lib/airport";

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const points = data.filter((d) => d.composite != null);
  const w = 640;
  const h = 200;
  const pad = 30;
  if (points.length < 2) {
    return <p className="text-xs text-gray-400">样本时间不足，暂无法绘制趋势图。</p>;
  }
  const max = 10;
  const min = 0;
  const stepX = (w - pad * 2) / (points.length - 1);
  const xy = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - ((p.composite as number) - min) / (max - min)) * (h - pad * 2);
    return { x, y, p };
  });
  const path = xy.map((d) => `${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="综合口碑趋势">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e5e7eb" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#e5e7eb" />
      {[0, 5, 10].map((v) => {
        const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
        return (
          <g key={v}>
            <text x={4} y={y + 3} className="fill-gray-400" fontSize={9}>
              {v}
            </text>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#f3f4f6" />
          </g>
        );
      })}
      <polyline points={path} fill="none" stroke="#2563eb" strokeWidth={2} />
      {xy.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={2.5} fill="#2563eb" />
      ))}
      <text x={last.x} y={Math.max(pad, last.y - 6)} className="fill-blue-600" fontSize={10} textAnchor="end">
        {(last.p.composite as number).toFixed(1)}
      </text>
      <text x={w - pad} y={h - 8} className="fill-gray-400" fontSize={9} textAnchor="end">
        {points[0].p.month} → {points[points.length - 1].p.month}
      </text>
    </svg>
  );
}
