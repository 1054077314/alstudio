import { AirportSummary } from "@/lib/scoring";
import { AirportLink, RiskBadge, ScorePill } from "./ui";

type Metric = "composite" | "stability" | "value" | "minPrice" | "trend" | "risk";

export function RankingBoard({
  title,
  items,
  metric = "composite",
}: {
  title: string;
  items: AirportSummary[];
  metric?: Metric;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">样本不足或暂无数据</p>
      ) : (
        <ol className="space-y-2">
          {items.map((a, i) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-5 text-right text-xs font-semibold text-gray-400">{i + 1}</span>
                <div className="min-w-0 truncate">
                  <AirportLink slug={a.slug} name={a.name} logoUrl={a.logoUrl} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {metric === "minPrice" && (
                  <span className="font-semibold text-gray-800">¥{a.minPrice?.toFixed(0)}/月</span>
                )}
                {metric === "trend" && (
                  <span className={a.trendDirection === "down" ? "font-semibold text-red-600" : a.trendDirection === "up" ? "text-green-600" : "text-gray-400"}>
                    {a.trendDelta != null ? (a.trendDelta > 0 ? `↑${a.trendDelta.toFixed(1)}` : a.trendDelta < 0 ? `↓${Math.abs(a.trendDelta).toFixed(1)}` : "—") : "—"}
                  </span>
                )}
                {metric === "risk" && <RiskBadge level={a.riskLevel} />}
                {(metric === "composite" || metric === "stability" || metric === "value") && (
                  <ScorePill value={a[metric]} />
                )}
                <span className="text-xs text-gray-400">{a.feedbackCount}条</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
