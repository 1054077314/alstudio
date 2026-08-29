import { getAirportSummaries, AirportSummary } from "./scoring";
import { SAMPLE_THRESHOLDS, RiskLevel } from "./constants";

const RISK_ORDER: Record<string, number> = { low: 0, medium: 1, elevated: 2, high: 3 };

export function buildBoards(all: AirportSummary[]) {
  const rankable = all.filter((a) => (a.feedbackCount ?? 0) >= SAMPLE_THRESHOLDS.rankingMin);
  const by = (key: (a: AirportSummary) => number | null) =>
    [...rankable].filter((a) => key(a) != null).sort((a, b) => (key(b) as number) - (key(a) as number));

  return {
    composite: by((a) => a.composite).slice(0, 20),
    stability: by((a) => a.stability).slice(0, 20),
    value: by((a) => a.value).slice(0, 20),
    lowPrice: [...rankable]
      .filter((a) => a.minPrice != null)
      .sort((a, b) => (a.minPrice as number) - (b.minPrice as number))
      .slice(0, 20),
    oldBrand: [...rankable].sort((a, b) => (b.feedbackCount ?? 0) - (a.feedbackCount ?? 0)).slice(0, 20),
    rising: [...rankable]
      .filter((a) => a.trendDelta != null && a.trendDelta > 0)
      .sort((a, b) => (b.trendDelta as number) - (a.trendDelta as number))
      .slice(0, 20),
    falling: [...rankable]
      .filter((a) => a.trendDelta != null && a.trendDelta < 0)
      .sort((a) => a.trendDelta as number)
      .slice(0, 20),
    risk: [...rankable]
      .sort((a, b) => RISK_ORDER[b.riskLevel as RiskLevel] - RISK_ORDER[a.riskLevel as RiskLevel])
      .slice(0, 20),
  };
}

export type Boards = ReturnType<typeof buildBoards>;

export async function getBoards() {
  const summaries = await getAirportSummaries();
  return { summaries, boards: buildBoards(summaries) };
}
