import type { Sentiment } from "./constants";

export interface AiRegionTag {
  [region: string]: "positive" | "negative" | "neutral";
}

export interface AiAnalysisResult {
  sentiment: Sentiment;
  aiStability: number | null;
  aiSpeed: number | null;
  aiCustomerService: number | null;
  aiValue: number | null;
  aiNodeQuality: number | null;
  aiUnlock: number | null;
  usageDuration: string | null;
  regionTags: AiRegionTag;
  serviceTags: string[];
  priceTags: string[];
  unlockTags: string[];
  riskTags: string[];
  promotionProbability: number;
  informationQuality: number;
  aiSummary: string;
  aiRaw: unknown;
}

// Keyword dictionaries (Chinese-focused, heuristic). A real LLM can replace this
// implementation entirely — see `analyzeFeedback` for the single integration point.
const POS = ["稳定", "好用", "推荐", "快", "满意", "流畅", "不错", "靠谱", "良心", "速度可以", "很稳", "顺畅"];
const NEG = ["慢", "卡", "断流", "丢包", "跑路", "垃圾", "坑", "差", "连不上", "连不上", "投诉", "退款", "失联", "崩", "不稳定", "无法使用", "不能用"];

const DIM_POS: Record<string, string[]> = {
  stability: ["稳定", "很稳", "没断过", "一直在线", "从不掉线"],
  speed: ["快", "速度可以", "速度快", "流畅", "顺畅", "延迟低"],
  customerService: ["客服好", "客服回复快", "客服态度好", "售后好"],
  value: ["性价比高", "便宜", "划算", "价格合理", "良心价"],
  nodeQuality: ["节点多", "节点质量好", "节点全", "覆盖广"],
  unlock: ["能看奈飞", "解锁奈飞", "能看netflix", "解锁流媒体", "能上chatgpt", "能用gpt"],
};
const DIM_NEG: Record<string, string[]> = {
  stability: ["不稳定", "断流", "掉线", "常断", "崩", "频繁断"],
  speed: ["慢", "卡", "速度慢", "晚高峰慢", "拥堵", "延迟高"],
  customerService: ["客服差", "客服不回", "工单慢", "售后差", "客服烂"],
  value: ["贵", "性价比低", "不划算", "涨价", "坑钱"],
  nodeQuality: ["节点少", "节点失效", "节点挂", "节点质量差"],
  unlock: ["看不了奈飞", "解锁不了", "不能看netflix", "无法解锁", "用不了gpt"],
};

const REGION_KW: Record<string, string[]> = {
  hongkong: ["香港", "hk", "hongkong"],
  japan: ["日本", "jp", "japan", "东京", "大阪"],
  singapore: ["新加坡", "sg", "singapore"],
  taiwan: ["台湾", "tw", "taiwan"],
  usa: ["美国", "美区", "us", "usa", "洛杉矶", "洛杉矶"],
  korea: ["韩国", "首尔", "korea"],
  europe: ["欧洲", "德国", "英国", "法兰克福"],
  other: [],
};

const SERVICE_KW: Record<string, string[]> = {
  cs_good: ["客服好", "客服回复快", "客服态度好"],
  cs_bad: ["客服差", "客服不回", "客服烂", "客服慢"],
  refund_issue: ["退款", "退钱", "不退"],
  ticket_slow: ["工单慢", "工单不回", "ticket"],
  after_sales: ["售后", "售后差", "售后好"],
};

const PRICE_KW: Record<string, string[]> = {
  cheap: ["便宜", "实惠", "低价"],
  fair_price: ["价格合理", "价格还行", "价位合理"],
  expensive: ["贵", "太贵", "价格高"],
  price_up: ["涨价", "又涨", "上调价格"],
  value_high: ["性价比高", "性价比不错", "划算"],
  value_low: ["性价比低", "不划算", "性价比差"],
};

const UNLOCK_KW: Record<string, string[]> = {
  netflix: ["奈飞", "netflix", "nf"],
  disney: ["disney", "迪士尼"],
  youtube: ["youtube", "油管"],
  tiktok: ["tiktok", "抖音国际"],
  chatgpt: ["chatgpt", "gpt", "chat gpt"],
  claude: ["claude"],
  gemini: ["gemini"],
  other_unlock: ["流媒体", "解锁"],
};

const RISK_KW: Record<string, string[]> = {
  run_away: ["跑路", "卷款", "跑路了"],
  lost_contact: ["失联", "联系不上", "找不到人"],
  site_down: ["官网打不开", "官网挂了", "网站打不开", "域名打不开"],
  nodes_down: ["节点全挂", "节点全部失效", "所有节点挂", "节点全死"],
  mass_refund: ["大规模退款", "集体退款", "都在退款"],
  owner_lost: ["老板失联", "老板跑", "找不到老板"],
  domain_change: ["换域名", "更换域名", "又换域名"],
  hard_sell_long: ["强推年付", "只卖年付", "取消月付", "强推长期"],
  sudden_promo: ["突然大促", "大力度促销", "疯狂促销", "骨折价"],
};

const PROMO_URL = /(https?:\/\/[^\s]+)/gi;
const PROMO_CODE_KW = ["邀请码", "优惠码", "注册链接", "推荐链接", "购买链接", "aff", "返利", "推广链接", "专属链接"];
const PROMO_HARDSELL = ["闭眼入", "速度无敌", "最好用", "强烈推荐", "无脑入", "神机", "秒杀一切"];

function hasAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

function dimScore(text: string, dim: string): number | null {
  const pos = hasAny(text, DIM_POS[dim]);
  const neg = hasAny(text, DIM_NEG[dim]);
  if (pos && !neg) return 8.5;
  if (neg && !pos) return 3.5;
  if (pos && neg) return 6;
  return null;
}

function infoQuality(text: string): number {
  const len = text.trim().length;
  const hasDuration = /(用了|使用|年|个月|天|体验).{0,6}(稳定|速度|感觉|下来)/.test(text) || /(年|个月)/.test(text);
  const hasSpecifics = /(香港|日本|新加坡|台湾|美国|节点|晚高峰|断流|丢包|退款|客服)/.test(text);
  const hasNumbers = /\d+/.test(text);
  if (len < 12) return 0.25;
  if (len < 40) return 0.5;
  let q = 0.6;
  if (hasDuration) q += 0.15;
  if (hasSpecifics) q += 0.15;
  if (hasNumbers) q += 0.1;
  return Math.min(1, q);
}

function detectPromotion(text: string): number {
  let p = 0;
  const urls = text.match(PROMO_URL) || [];
  if (urls.length > 0) p += 0.5;
  if (hasAny(text, PROMO_CODE_KW)) p += 0.4;
  if (hasAny(text, PROMO_HARDSELL)) p += 0.3;
  return Math.min(1, p);
}

export interface AnalyzeInput {
  content: string;
  // Optional context for a future real LLM integration.
  airportName?: string;
}

// Single integration point. Replace the body with a real LLM call when an API key
// is available; keep the same return shape.
export async function analyzeFeedback(input: AnalyzeInput): Promise<AiAnalysisResult> {
  const text = (input.content || "").toLowerCase();

  const pos = hasAny(text, POS);
  const neg = hasAny(text, NEG);
  let sentiment: Sentiment = "neutral";
  if (pos && !neg) sentiment = "positive";
  else if (neg && !pos) sentiment = "negative";

  const usageDuration =
    text.match(/用了\s*(\d+\s*[年个月天])/)?.at(1) ||
    text.match(/(\d+\s*年)/)?.at(1) ||
    null;

  const regionTags: AiRegionTag = {};
  for (const [region, kws] of Object.entries(REGION_KW)) {
    if (region === "other") continue;
    if (hasAny(text, kws)) {
      // crude polarity around the region mention
      regionTags[region] = sentiment === "negative" ? "negative" : sentiment === "positive" ? "positive" : "neutral";
    }
  }

  const serviceTags = Object.entries(SERVICE_KW).filter(([, k]) => hasAny(text, k)).map(([k]) => k);
  const priceTags = Object.entries(PRICE_KW).filter(([, k]) => hasAny(text, k)).map(([k]) => k);
  const unlockTags = Object.entries(UNLOCK_KW).filter(([, k]) => hasAny(text, k)).map(([k]) => k);
  const riskTags = Object.entries(RISK_KW).filter(([, k]) => hasAny(text, k)).map(([k]) => k);

  const informationQuality = infoQuality(text);
  const promotionProbability = detectPromotion(text);

  const aiSummary =
    `情绪：${sentiment === "positive" ? "正面" : sentiment === "negative" ? "负面" : "中性"}。` +
    (riskTags.length ? `包含风险相关表述（${riskTags.length}）。` : "") +
    (promotionProbability > 0.5 ? "疑似包含推广内容。" : "");

  return {
    sentiment,
    aiStability: dimScore(text, "stability"),
    aiSpeed: dimScore(text, "speed"),
    aiCustomerService: dimScore(text, "customerService"),
    aiValue: dimScore(text, "value"),
    aiNodeQuality: dimScore(text, "nodeQuality"),
    aiUnlock: dimScore(text, "unlock"),
    usageDuration,
    regionTags,
    serviceTags,
    priceTags,
    unlockTags,
    riskTags,
    promotionProbability,
    informationQuality,
    aiSummary,
    aiRaw: { heuristic: true },
  };
}
