// Shared domain constants and lightweight types used across the app.

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const BILLING_CYCLES = ["monthly", "quarterly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

// Feedback lifecycle status. Note: "official" feedback is stored separately and
// is NEVER included in reputation scoring.
export const FEEDBACK_STATUSES = [
  "pending",
  "analyzed",
  "approved",
  "rejected",
  "promotion",
  "official",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

// Statuses that participate in user-reputation scoring.
export const SCORABLE_STATUSES: FeedbackStatus[] = [
  "analyzed",
  "approved",
];

export const RISK_LEVELS = ["low", "medium", "elevated", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

// Scoring dimension keys (all driven by user feedback, never "本站测速").
export const DIMENSIONS = [
  "stability",
  "speed",
  "value",
  "customerService",
  "nodeQuality",
  "unlock",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  stability: "稳定性",
  speed: "速度",
  value: "性价比",
  customerService: "客服",
  nodeQuality: "节点质量",
  unlock: "流媒体/AI",
};

// Time windows used everywhere (days). `all` = no lower bound.
export const WINDOWS = [
  { key: "7d", days: 7, label: "最近7天" },
  { key: "30d", days: 30, label: "最近30天" },
  { key: "90d", days: 90, label: "最近90天" },
  { key: "365d", days: 365, label: "最近1年" },
  { key: "all", days: Infinity, label: "历史总评" },
] as const;
export type WindowKey = (typeof WINDOWS)[number]["key"];

export const REGION_TAGS = [
  "hongkong",
  "japan",
  "singapore",
  "taiwan",
  "usa",
  "korea",
  "europe",
  "other",
] as const;
export const REGION_LABELS: Record<string, string> = {
  hongkong: "香港",
  japan: "日本",
  singapore: "新加坡",
  taiwan: "台湾",
  usa: "美国",
  korea: "韩国",
  europe: "欧洲",
  other: "其他",
};

export const SERVICE_TAGS = [
  "cs_good",
  "cs_bad",
  "refund_issue",
  "ticket_slow",
  "after_sales",
] as const;
export const SERVICE_LABELS: Record<string, string> = {
  cs_good: "客服好",
  cs_bad: "客服差",
  refund_issue: "退款问题",
  ticket_slow: "工单慢",
  after_sales: "售后问题",
};

export const PRICE_TAGS = [
  "cheap",
  "fair_price",
  "expensive",
  "price_up",
  "value_high",
  "value_low",
] as const;
export const PRICE_LABELS: Record<string, string> = {
  cheap: "便宜",
  fair_price: "价格合理",
  expensive: "贵",
  price_up: "涨价",
  value_high: "性价比高",
  value_low: "性价比低",
};

export const UNLOCK_TAGS = [
  "netflix",
  "disney",
  "youtube",
  "tiktok",
  "chatgpt",
  "claude",
  "gemini",
  "other_unlock",
] as const;
export const UNLOCK_LABELS: Record<string, string> = {
  netflix: "Netflix",
  disney: "Disney+",
  youtube: "YouTube",
  tiktok: "TikTok",
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  other_unlock: "其他解锁",
};

export const RISK_TAGS = [
  "run_away",
  "lost_contact",
  "site_down",
  "nodes_down",
  "mass_refund",
  "owner_lost",
  "domain_change",
  "hard_sell_long",
  "sudden_promo",
] as const;
export const RISK_LABELS: Record<string, string> = {
  run_away: "跑路",
  lost_contact: "失联",
  site_down: "官网打不开",
  nodes_down: "节点全部失效",
  mass_refund: "大规模退款问题",
  owner_lost: "老板失联",
  domain_change: "频繁更换域名",
  hard_sell_long: "强推长期套餐",
  sudden_promo: "突然大促",
};

// Default source credibility weights (Phase 3). Tunable via DataSource rows.
export const DEFAULT_SOURCE_WEIGHTS: Record<string, number> = {
  V2EX: 0.9,
  Reddit: 0.9,
  GitHub: 0.9,
  Telegram: 0.6,
  X: 0.6,
  独立论坛: 0.6,
  个人博客: 0.4,
  机场评测博客: 0.3,
  机场导航站: 0.2,
  机场官方: 0,
};

// Default time-decay buckets (days -> multiplier). Tunable via ScoreConfig.
export const DEFAULT_TIME_DECAY: Record<string, number> = {
  "7": 1.0,
  "30": 0.95,
  "90": 0.85,
  "180": 0.7,
  "365": 0.5,
  "730": 0.3,
  else: 0.15,
};

// Composite score dimension weights. Tunable via ScoreConfig.
export const DEFAULT_COMPOSITE_WEIGHTS: Record<Dimension, number> = {
  stability: 0.3,
  speed: 0.2,
  value: 0.2,
  nodeQuality: 0.1,
  customerService: 0.1,
  unlock: 0.1,
};

// Low-sample protection thresholds (Phase 4).
export const SAMPLE_THRESHOLDS = {
  insufficient: 10, // < 10 -> 数据不足
  low: 30, // 10-30 -> 低可信度
  medium: 100, // 30-100 -> 中可信度
  // > 100 -> 较高可信度
  rankingMin: 30, // min valid feedback to enter ranking boards
};

export function credibilityLabel(count: number): string {
  if (count < SAMPLE_THRESHOLDS.insufficient) return "数据不足";
  if (count < SAMPLE_THRESHOLDS.low) return "低可信度";
  if (count < SAMPLE_THRESHOLDS.medium) return "中可信度";
  return "较高可信度";
}
