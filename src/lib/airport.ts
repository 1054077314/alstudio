import { prisma } from "./prisma";
import { computeAirportScores } from "./scoring";
import { SCORABLE_STATUSES, DIMENSIONS, Dimension } from "./constants";
import { getScoreConfig } from "./scoring";

export interface TrendPoint {
  month: string; // YYYY-MM
  composite: number | null;
  stability: number | null;
  negativePct: number;
  count: number;
}

export interface AirportDetail {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  officialSite: string | null;
  foundedAt: Date | null;
  description: string | null;
  minPrice: number | null;
  minPlanName: string | null;
  minTraffic: string | null;
  monthlySupported: boolean;
  deviceLimit: string | null;
  paymentMethods: string | null;
  nodeRegions: string | null;
  supportsNetflix: boolean;
  supportsChatgpt: boolean;
  dataConfidence: string;
  aliases: string[];
  oldNames: string[];
  domains: string[];
  plans: {
    id: string;
    name: string;
    price: number;
    billingCycle: string;
    traffic: string | null;
    deviceLimit: number | null;
    featured: boolean;
  }[];
  scores: Awaited<ReturnType<typeof computeAirportScores>>;
  riskEvents: {
    id: string;
    eventDate: Date;
    title: string;
    description: string | null;
    type: string;
    source: string | null;
  }[];
  trendHistory: TrendPoint[];
  hasData: boolean;
}

interface ScorableItem {
  publishedAt: Date | null;
  crawledAt: Date;
  sentiment: string | null;
  aiStability: number | null;
  aiSpeed: number | null;
  aiCustomerService: number | null;
  aiValue: number | null;
  aiNodeQuality: number | null;
  aiUnlock: number | null;
  weight: number;
}

function buildItems(rows: any[]): ScorableItem[] {
  return rows.map((r) => {
    const sourceCred = r.sourceCredibility ?? r.dataSource?.credibilityWeight ?? 0.7;
    const userCred = r.userCredibility ?? 0.7;
    const contentQual = r.contentQuality ?? r.informationQuality ?? 0.5;
    const promo = r.promotionProbability != null && r.promotionProbability > 0.5 ? 0.1 : 1;
    const weight = sourceCred * userCred * contentQual * promo; // time decay disabled for history
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
      weight,
    };
  });
}

function scoreItems(
  items: ScorableItem[],
  weights: Record<Dimension, number>
): { dims: Record<Dimension, number | null>; composite: number | null; negativePct: number; count: number } {
  const acc: Record<Dimension, { n: number; d: number }> = {
    stability: { n: 0, d: 0 },
    speed: { n: 0, d: 0 },
    value: { n: 0, d: 0 },
    customerService: { n: 0, d: 0 },
    nodeQuality: { n: 0, d: 0 },
    unlock: { n: 0, d: 0 },
  };
  const dims: Record<Dimension, number | null> = {
    stability: null,
    speed: null,
    value: null,
    customerService: null,
    nodeQuality: null,
    unlock: null,
  };
  let negW = 0;
  let totalW = 0;
  for (const it of items) {
    const w = it.weight;
    totalW += w;
    if (it.sentiment === "negative") negW += w;
    const scores: [Dimension, number | null][] = [
      ["stability", it.aiStability],
      ["speed", it.aiSpeed],
      ["value", it.aiValue],
      ["customerService", it.aiCustomerService],
      ["nodeQuality", it.aiNodeQuality],
      ["unlock", it.aiUnlock],
    ];
    for (const [dim, s] of scores) {
      if (s != null) {
        acc[dim].n += w * s;
        acc[dim].d += w;
      }
    }
  }
  let cw = 0;
  let cNum = 0;
  for (const dim of DIMENSIONS) {
    const v = acc[dim].d > 0 ? Math.round((acc[dim].n / acc[dim].d) * 10) / 10 : null;
    dims[dim] = v;
    if (v != null) {
      cw += weights[dim];
      cNum += weights[dim] * v;
    }
  }
  const composite = cw > 0 ? Math.round((cNum / cw) * 10) / 10 : null;
  const negativePct = totalW > 0 ? Math.round((negW / totalW) * 1000) / 10 : 0;
  return { dims, composite, negativePct, count: items.length };
}

export async function computeTrendHistory(airportId: string, months = 12): Promise<TrendPoint[]> {
  const config = await getScoreConfig();
  const rows = await prisma.feedback.findMany({
    where: { airportId, status: { in: SCORABLE_STATUSES } },
    include: { dataSource: true },
  });
  if (rows.length === 0) return [];
  const items = buildItems(rows);
  const buckets = new Map<string, ScorableItem[]>();
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, []);
  }
  for (const it of items) {
    const dt = it.publishedAt ?? it.crawledAt;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) buckets.get(key)!.push(it);
  }
  const out: TrendPoint[] = [];
  for (const [month, bucket] of buckets.entries()) {
    if (bucket.length === 0) {
      out.push({ month, composite: null, stability: null, negativePct: 0, count: 0 });
      continue;
    }
    const r = scoreItems(bucket, config.compositeWeights);
    out.push({ month, composite: r.composite, stability: r.dims.stability, negativePct: r.negativePct, count: r.count });
  }
  return out;
}

export async function getAirportDetail(slug: string): Promise<AirportDetail | null> {
  const airport = await prisma.airport.findUnique({
    where: { slug },
    include: {
      plans: true,
      aliases: true,
      domains: true,
      riskEvents: { orderBy: { eventDate: "desc" } },
    },
  });
  if (!airport) return null;

  const scores = await computeAirportScores(airport.id);
  const trendHistory = await computeTrendHistory(airport.id);

  return {
    id: airport.id,
    slug: airport.slug,
    name: airport.name,
    logoUrl: airport.logoUrl,
    officialSite: airport.officialSite,
    foundedAt: airport.foundedAt,
    description: airport.description,
    minPrice: airport.minPrice,
    minPlanName: airport.minPlanName,
    minTraffic: airport.minTraffic,
    monthlySupported: airport.monthlySupported,
    deviceLimit: airport.deviceLimit,
    paymentMethods: airport.paymentMethods,
    nodeRegions: airport.nodeRegions,
    supportsNetflix: airport.supportsNetflix,
    supportsChatgpt: airport.supportsChatgpt,
    dataConfidence: airport.dataConfidence,
    aliases: airport.aliases.filter((x) => x.type === "ALIAS").map((x) => x.value),
    oldNames: airport.aliases.filter((x) => x.type === "OLD_NAME").map((x) => x.value),
    domains: airport.domains.map((x) => x.domain),
    plans: airport.plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      billingCycle: p.billingCycle,
      traffic: p.traffic,
      deviceLimit: p.deviceLimit,
      featured: p.featured,
    })),
    scores,
    riskEvents: airport.riskEvents.map((e) => ({
      id: e.id,
      eventDate: e.eventDate,
      title: e.title,
      description: e.description,
      type: e.type,
      source: e.source,
    })),
    trendHistory,
    hasData: scores.hasData,
  };
}

export interface EvidenceItem {
  id: string;
  sourcePlatform: string;
  originalUrl: string | null;
  authorName: string | null;
  publishedAt: Date | null;
  processedContent: string | null;
  rawContent: string;
  sentiment: string | null;
  aiStability: number | null;
  aiSpeed: number | null;
  aiValue: number | null;
  regionTags: any;
  serviceTags: string[];
  priceTags: string[];
  unlockTags: string[];
  riskTags: string[];
  promotionProbability: number | null;
  computedWeight: number | null;
}

export async function getFeedbackEvidence(
  airportId: string,
  opts: { dimension?: Dimension; sentiment?: string; limit?: number } = {}
): Promise<EvidenceItem[]> {
  const where: any = { airportId, status: { in: SCORABLE_STATUSES } };
  if (opts.sentiment) where.sentiment = opts.sentiment;
  if (opts.dimension) {
    const col = `ai${opts.dimension.charAt(0).toUpperCase()}${opts.dimension.slice(1)}`;
    where[col] = { not: null };
  }
  const rows = await prisma.feedback.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { crawledAt: "desc" }],
    take: opts.limit ?? 50,
  });
  return rows.map((r) => ({
    id: r.id,
    sourcePlatform: r.sourcePlatform,
    originalUrl: r.originalUrl,
    authorName: r.authorName,
    publishedAt: r.publishedAt,
    processedContent: r.processedContent,
    rawContent: r.rawContent,
    sentiment: r.sentiment,
    aiStability: r.aiStability,
    aiSpeed: r.aiSpeed,
    aiValue: r.aiValue,
    regionTags: parseJson(r.regionTags),
    serviceTags: parseJson(r.serviceTags) || [],
    priceTags: parseJson(r.priceTags) || [],
    unlockTags: parseJson(r.unlockTags) || [],
    riskTags: parseJson(r.riskTags) || [],
    promotionProbability: r.promotionProbability,
    computedWeight: r.computedWeight,
  }));
}

function parseJson(s: string | null): any {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
