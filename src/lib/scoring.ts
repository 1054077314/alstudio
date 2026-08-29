import { prisma } from "./prisma";
import {
  SCORABLE_STATUSES,
  DEFAULT_TIME_DECAY,
  DEFAULT_COMPOSITE_WEIGHTS,
  DIMENSIONS,
  Dimension,
  WINDOWS,
  WindowKey,
  RISK_LEVELS,
  RiskLevel,
  credibilityLabel,
  RISK_LABELS,
} from "./constants";

interface ScoreConfig {
  compositeWeights: Record<Dimension, number>;
  timeDecay: Record<string, number>;
}

export async function getScoreConfig(): Promise<ScoreConfig> {
  const row = await prisma.scoreConfig.findUnique({ where: { id: "singleton" } });
  let compositeWeights = DEFAULT_COMPOSITE_WEIGHTS;
  let timeDecay = DEFAULT_TIME_DECAY;
  if (row) {
    try {
      compositeWeights = { ...DEFAULT_COMPOSITE_WEIGHTS, ...JSON.parse(row.compositeWeights) };
    } catch {
      /* keep default */
    }
    try {
      timeDecay = { ...DEFAULT_TIME_DECAY, ...JSON.parse(row.timeDecay) };
    } catch {
      /* keep default */
    }
  }
  return { compositeWeights, timeDecay };
}

export function timeWeight(daysOld: number, decay: Record<string, number>): number {
  const d = Math.max(0, Math.floor(daysOld));
  if (d <= 7) return decay["7"] ?? 1.0;
  if (d <= 30) return decay["30"] ?? 0.95;
  if (d <= 90) return decay["90"] ?? 0.85;
  if (d <= 180) return decay["180"] ?? 0.7;
  if (d <= 365) return decay["365"] ?? 0.5;
  if (d <= 730) return decay["730"] ?? 0.3;
  return decay["else"] ?? 0.15;
}

export interface WindowScore {
  composite: number | null;
  stability: number | null;
  speed: number | null;
  value: number | null;
  customerService: number | null;
  nodeQuality: number | null;
  unlock: number | null;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  feedbackCount: number;
  credibility: number; // average computed weight (representativeness)
  confidenceLabel: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  riskCount30: number;
  total30: number;
  ratio: number;
  tags: string[];
  message: string;
}

export interface AirportScores {
  windows: Record<WindowKey, WindowScore>;
  risk: RiskAssessment;
  trend: {
    delta30vs90: number | null;
    direction: "up" | "down" | "flat";
    note: string;
  };
  hasData: boolean;
}

interface ScorableFeedback {
  publishedAt: Date | null;
  crawledAt: Date;
  sentiment: string | null;
  aiStability: number | null;
  aiSpeed: number | null;
  aiCustomerService: number | null;
  aiValue: number | null;
  aiNodeQuality: number | null;
  aiUnlock: number | null;
  sourceCredibility: number | null;
  userCredibility: number | null;
  contentQuality: number | null;
  informationQuality: number | null;
  promotionProbability: number | null;
  riskTags: string[];
  computedWeight: number;
}

function daysOld(date: Date | null, fallback: Date): number {
  const d = date ?? fallback;
  return (Date.now() - d.getTime()) / 86400000;
}

function emptyWindow(): WindowScore {
  return {
    composite: null,
    stability: null,
    speed: null,
    value: null,
    customerService: null,
    nodeQuality: null,
    unlock: null,
    positivePct: 0,
    neutralPct: 0,
    negativePct: 0,
    feedbackCount: 0,
    credibility: 0,
    confidenceLabel: credibilityLabel(0),
  };
}

export async function computeAirportScores(airportId: string): Promise<AirportScores> {
  const config = await getScoreConfig();
  const rows = await prisma.feedback.findMany({
    where: { airportId, status: { in: SCORABLE_STATUSES } },
    include: { dataSource: true },
  });

  if (rows.length === 0) {
    return {
      windows: WINDOWS.reduce((acc, w) => {
        acc[w.key] = emptyWindow();
        return acc;
      }, {} as Record<WindowKey, WindowScore>),
      risk: emptyRisk(),
      trend: { delta30vs90: null, direction: "flat", note: "" },
      hasData: false,
    };
  }

  // Pre-compute per-feedback weight + parse tags once.
  const items: ScorableFeedback[] = rows.map((r) => {
    const age = daysOld(r.publishedAt, r.crawledAt);
    const sourceCred = r.sourceCredibility ?? r.dataSource?.credibilityWeight ?? 0.7;
    const userCred = r.userCredibility ?? 0.7;
    const contentQual = r.contentQuality ?? r.informationQuality ?? 0.5;
    const tw = timeWeight(age, config.timeDecay);
    const promo = r.promotionProbability != null && r.promotionProbability > 0.5 ? 0.1 : 1;
    const computedWeight = sourceCred * userCred * contentQual * tw * promo;
    let riskTags: string[] = [];
    try {
      riskTags = r.riskTags ? JSON.parse(r.riskTags) : [];
    } catch {
      riskTags = [];
    }
    return {
      publishedAt: r.publishedAt,
      crawledAt: r.crawledAt,
      sentiment: r.sentiment,
      aiStability: r.aiStability,
      aiSpeed: r.aiSpeed,
      aiCustomerService: r.aiCustomerService,
      aiValue: r.aiValue,
      aiNodeQuality: r.aiNodeQuality,
      aiUnlock: r.aiUnlock,
      sourceCredibility: r.sourceCredibility,
      userCredibility: r.userCredibility,
      contentQuality: r.contentQuality,
      informationQuality: r.informationQuality,
      promotionProbability: r.promotionProbability,
      riskTags,
      computedWeight,
    };
  });

  const windows = {} as Record<WindowKey, WindowScore>;
  for (const w of WINDOWS) {
    const inWindow = items.filter((it) =>
      w.days === Infinity ? true : daysOld(it.publishedAt, it.crawledAt) <= w.days
    );
    windows[w.key] = scoreWindow(inWindow, config.compositeWeights);
  }

  const risk = computeRisk(items, config.timeDecay);
  const trend = computeTrend(windows);

  return { windows, risk, trend, hasData: true };
}

function scoreWindow(items: ScorableFeedback[], weights: Record<Dimension, number>): WindowScore {
  if (items.length === 0) return emptyWindow();
  const dims: Record<Dimension, { num: number; den: number }> = {
    stability: { num: 0, den: 0 },
    speed: { num: 0, den: 0 },
    value: { num: 0, den: 0 },
    customerService: { num: 0, den: 0 },
    nodeQuality: { num: 0, den: 0 },
    unlock: { num: 0, den: 0 },
  };
  const map: Record<Dimension, number | null> = {
    stability: null,
    speed: null,
    value: null,
    customerService: null,
    nodeQuality: null,
    unlock: null,
  };
  let posW = 0,
    neuW = 0,
    negW = 0,
    totalW = 0,
    credSum = 0;

  for (const it of items) {
    const w = it.computedWeight;
    totalW += w;
    credSum += w;
    if (it.sentiment === "positive") posW += w;
    else if (it.sentiment === "negative") negW += w;
    else neuW += w;

    const pairs: [Dimension, number | null][] = [
      ["stability", it.aiStability],
      ["speed", it.aiSpeed],
      ["value", it.aiValue],
      ["customerService", it.aiCustomerService],
      ["nodeQuality", it.aiNodeQuality],
      ["unlock", it.aiUnlock],
    ];
    for (const [dim, score] of pairs) {
      if (score != null) {
        dims[dim].num += w * score;
        dims[dim].den += w;
      }
    }
  }

  for (const dim of DIMENSIONS) {
    const d = dims[dim];
    map[dim] = d.den > 0 ? round1(d.num / d.den) : null;
  }

  // Composite: normalize over available dimensions using configured weights.
  let cw = 0,
    cNum = 0;
  for (const dim of DIMENSIONS) {
    if (map[dim] != null) {
      cw += weights[dim];
      cNum += weights[dim] * (map[dim] as number);
    }
  }
  const composite = cw > 0 ? round1(cNum / cw) : null;

  return {
    composite,
    stability: map.stability,
    speed: map.speed,
    value: map.value,
    customerService: map.customerService,
    nodeQuality: map.nodeQuality,
    unlock: map.unlock,
    positivePct: totalW > 0 ? round1((posW / totalW) * 100) : 0,
    neutralPct: totalW > 0 ? round1((neuW / totalW) * 100) : 0,
    negativePct: totalW > 0 ? round1((negW / totalW) * 100) : 0,
    feedbackCount: items.length,
    credibility: totalW > 0 ? round2(credSum / items.length) : 0,
    confidenceLabel: credibilityLabel(items.length),
  };
}

function emptyRisk(): RiskAssessment {
  return {
    level: "low",
    riskCount30: 0,
    total30: 0,
    ratio: 0,
    tags: [],
    message: "暂未收录到明显风险相关反馈。",
  };
}

const SEVERE_RISK_TAGS = ["run_away", "lost_contact", "site_down", "nodes_down", "mass_refund", "owner_lost"];

function computeRisk(items: ScorableFeedback[], _decay: Record<string, number>): RiskAssessment {
  const now = Date.now();
  const in30 = items.filter((it) => (now - (it.publishedAt ?? it.crawledAt).getTime()) / 86400000 <= 30);
  const total30 = in30.length;
  const riskItems = in30.filter((it) => it.riskTags.length > 0);
  const riskCount30 = riskItems.length;
  const ratio = total30 > 0 ? riskCount30 / total30 : 0;

  const tagCounts: Record<string, number> = {};
  for (const it of riskItems) {
    for (const t of it.riskTags) tagCounts[t] = (tagCounts[t] || 0) + 1;
  }
  const tags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  const severeCount = riskItems.filter((it) => it.riskTags.some((t) => SEVERE_RISK_TAGS.includes(t))).length;

  let level: RiskLevel = "low";
  if (severeCount >= 3) level = "high";
  else if (ratio >= 0.3) level = "elevated";
  else if (ratio >= 0.15) level = "medium";

  let message = "暂未收录到明显风险相关反馈。";
  if (level !== "low") {
    const top = tags.slice(0, 3).map((t) => RISK_LABELS[t] ?? t).join("、");
    message = `近期出现较多${top}相关反馈，请谨慎购买长期套餐，建议优先选择月付以控制风险。`;
  }

  return { level, riskCount30, total30, ratio: round2(ratio), tags, message };
}

function computeTrend(windows: Record<WindowKey, WindowScore>): AirportScores["trend"] {
  const c30 = windows["30d"].composite;
  const c90 = windows["90d"].composite;
  if (c30 == null || c90 == null) return { delta30vs90: null, direction: "flat", note: "" };
  const delta = round1(c30 - c90);
  let direction: "up" | "down" | "flat" = "flat";
  let note = "";
  if (delta <= -1.0) {
    direction = "down";
    note = `最近30天评分相比过去90天下降 ${Math.abs(delta).toFixed(1)} 分，近期口碑明显下降。`;
  } else if (delta <= -0.3) {
    direction = "down";
    note = `最近30天评分相比过去90天下降 ${Math.abs(delta).toFixed(1)} 分。`;
  } else if (delta >= 1.0) {
    direction = "up";
    note = `最近30天评分相比过去90天上升 ${delta.toFixed(1)} 分，近期口碑明显改善。`;
  } else if (delta >= 0.3) {
    direction = "up";
    note = `最近30天评分相比过去90天上升 ${delta.toFixed(1)} 分。`;
  } else {
    note = "近期口碑基本平稳。";
  }
  return { delta30vs90: delta, direction, note };
}

// Lightweight per-airport summary used by listings / rankings (uses 30d window
// with all-window fallback for composite, plus basic info).
export interface AirportSummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  officialSite: string | null;
  minPrice: number | null;
  minTraffic: string | null;
  monthlySupported: boolean;
  supportsNetflix: boolean;
  supportsChatgpt: boolean;
  riskLevel: RiskLevel;
  composite: number | null;
  stability: number | null;
  speed: number | null;
  value: number | null;
  feedbackCount: number;
  trendDirection: "up" | "down" | "flat";
  trendDelta: number | null;
  confidenceLabel: string;
}

export async function getAirportSummaries(): Promise<AirportSummary[]> {
  const airports = await prisma.airport.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
    include: { plans: true },
  });
  const out: AirportSummary[] = [];
  for (const a of airports) {
    const scores = await computeAirportScores(a.id);
    const comp = scores.windows["30d"].composite ?? scores.windows["all"].composite;
    const monthly = a.plans.find((p) => p.billingCycle === "monthly");
    out.push({
      id: a.id,
      slug: a.slug,
      name: a.name,
      logoUrl: a.logoUrl,
      officialSite: a.officialSite,
      minPrice: monthly?.price ?? a.minPrice ?? null,
      minTraffic: monthly?.traffic ?? a.minTraffic ?? null,
      monthlySupported: a.monthlySupported,
      supportsNetflix: a.supportsNetflix,
      supportsChatgpt: a.supportsChatgpt,
      riskLevel: scores.risk.level,
      composite: comp,
      stability: scores.windows["30d"].stability ?? scores.windows["all"].stability,
      speed: scores.windows["30d"].speed ?? scores.windows["all"].speed,
      value: scores.windows["30d"].value ?? scores.windows["all"].value,
      feedbackCount: scores.windows["all"].feedbackCount,
      trendDirection: scores.trend.direction,
      trendDelta: scores.trend.delta30vs90,
      confidenceLabel: scores.windows["all"].confidenceLabel,
    });
  }
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
