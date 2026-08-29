import { AirportDetail } from "./airport";
import { DIMENSION_LABELS, Dimension } from "./constants";

// Builds a human-readable, clearly-labeled summary from computed scores.
// NOTE: this is auto-generated from public feedback aggregation, not a human review.
export function buildAirportSummary(detail: AirportDetail): string {
  const w = detail.scores.windows["30d"].composite != null ? detail.scores.windows["30d"] : detail.scores.windows["all"];
  const count = w.feedbackCount;
  if (count === 0) return "该机场暂未收录到足够的有效用户反馈，评分与结论将在样本达到阈值后生成。";

  const parts: string[] = [];
  parts.push(`最近${w === detail.scores.windows["30d"] ? "30天" : "历史"}共收录 ${count} 条有效反馈。`);
  if (w.composite != null) parts.push(`综合口碑 ${w.composite.toFixed(1)} 分`);
  const dims = (Object.keys(DIMENSION_LABELS) as Dimension[])
    .map((d) => (w as any)[d] != null ? `${DIMENSION_LABELS[d]} ${(w as any)[d].toFixed(1)}` : null)
    .filter(Boolean);
  if (dims.length) parts.push(`（${dims.join("、"}）`);
  parts.push(
    `。正面评价 ${w.positivePct}% · 中性 ${w.neutralPct}% · 负面 ${w.negativePct}%。`
  );
  if (detail.scores.trend.note) parts.push(detail.scores.trend.note);
  parts.push(detail.scores.risk.message);
  return parts.join("");
}
