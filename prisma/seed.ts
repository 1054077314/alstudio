import { prisma } from "../src/lib/prisma";
import { createFeedbackWithAnalysis } from "../src/lib/feedback";

const DATA_SOURCES = [
  { platform: "V2EX", kind: "community", credibilityWeight: 0.9 },
  { platform: "Reddit", kind: "community", credibilityWeight: 0.9 },
  { platform: "Telegram", kind: "community", credibilityWeight: 0.6 },
  { platform: "GitHub", kind: "community", credibilityWeight: 0.9 },
];

interface AirportSeed {
  name: string;
  slug: string;
  officialSite: string;
  foundedMonthsAgo: number;
  minPrice: number;
  monthlySupported: boolean;
  netflix: boolean;
  chatgpt: boolean;
  aliases: string[];
  domains: string[];
  plans: { name: string; price: number; billingCycle: string; traffic: string }[];
  feedbacks: string[];
}

// Sentence pools used to synthesize varied demo feedback per airport.
const POS = [
  "用了两年多总体很稳定，晚高峰也不怎么卡。",
  "速度挺快的，看4KYouTube没压力，推荐。",
  "客服回复挺及时，工单几小时就处理了。",
  "性价比不错，这个价位算良心了。",
  "日本节点一直很稳，延迟低。",
];
const NEU = [
  "还行吧，平时能用，偶尔晚高峰慢一点。",
  "用了几个月，没太大感觉，中规中矩。",
  "价格一般，速度也一般。",
];
const NEG = [
  "最近香港节点晚上经常断流，挺影响使用。",
  "速度变慢了，晚高峰拥堵明显。",
  "客服基本不回，工单石沉大海。",
  "涨价有点狠，性价比下降。",
  "日本节点偶尔失效，要手动切换。",
];
const RISK = [
  "听说群里有人退款遇到问题，官网还能打开。",
  "最近节点不太稳，希望别跑路。",
];
const REGIONS = ["香港", "日本", "新加坡", "美国", "台湾"];

function pick(arr: string[], i: number) {
  return arr[i % arr.length];
}

function buildFeedbacks(seed: AirportSeed): string[] {
  const out: string[] = [];
  const total = 34; // >= ranking threshold for demo
  for (let i = 0; i < total; i++) {
    let base: string;
    const r = i % 10;
    if (r < 6) base = pick(POS, i) + pick(["", ` ${pick(REGIONS, i)}节点体验不错。`], i);
    else if (r < 9) base = pick(NEU, i);
    else base = pick(NEG, i);
    if (i % 17 === 16) base = pick(RISK, i);
    out.push(base);
  }
  return out;
}

const AIRPORTS: AirportSeed[] = [
  {
    name: "极速云",
    slug: "jisuyun",
    officialSite: "https://example-jisu.com",
    foundedMonthsAgo: 40,
    minPrice: 25,
    monthlySupported: true,
    netflix: true,
    chatgpt: true,
    aliases: ["极速云机场", "JSY"],
    domains: ["example-jisu.com", "jisu.vpn"],
    plans: [
      { name: "入门月付", price: 25, billingCycle: "monthly", traffic: "100GB" },
      { name: "年付套餐", price: 220, billingCycle: "yearly", traffic: "1.2TB" },
    ],
    feedbacks: [],
  },
  {
    name: "樱花隧道",
    slug: "yinghua",
    officialSite: "https://example-sakura.com",
    foundedMonthsAgo: 20,
    minPrice: 30,
    monthlySupported: true,
    netflix: true,
    chatgpt: false,
    aliases: ["樱花", "SakuraTunnel"],
    domains: ["example-sakura.com"],
    plans: [{ name: "标准月付", price: 30, billingCycle: "monthly", traffic: "150GB" }],
    feedbacks: [],
  },
  {
    name: "银河VPN",
    slug: "yinhe",
    officialSite: "https://example-galaxy.com",
    foundedMonthsAgo: 60,
    minPrice: 18,
    monthlySupported: true,
    netflix: false,
    chatgpt: true,
    aliases: ["银河", "Galaxy"],
    domains: ["example-galaxy.com", "galaxy-node.com"],
    plans: [{ name: "轻量月付", price: 18, billingCycle: "monthly", traffic: "80GB" }],
    feedbacks: [],
  },
];

async function main() {
  // Ensure scoring config singleton exists.
  await prisma.scoreConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  for (const ds of DATA_SOURCES) {
    await prisma.dataSource.upsert({
      where: { platform: ds.platform },
      update: ds,
      create: ds,
    });
  }

  const sources = await prisma.dataSource.findMany();

  for (const a of AIRPORTS) {
    const existing = await prisma.airport.findUnique({ where: { slug: a.slug } });
    if (existing) {
      console.log(`跳过已存在机场: ${a.name}`);
      continue;
    }
    const airport = await prisma.airport.create({
      data: {
        name: a.name,
        slug: a.slug,
        officialSite: a.officialSite,
        foundedAt: new Date(Date.now() - a.foundedMonthsAgo * 30 * 86400000),
        minPrice: a.minPrice,
        minPlanName: a.plans[0]?.name,
        minTraffic: a.plans[0]?.traffic,
        monthlySupported: a.monthlySupported,
        supportsNetflix: a.netflix,
        supportsChatgpt: a.chatgpt,
        aliases: { create: a.aliases.map((v) => ({ type: "ALIAS", value: v })) },
        domains: { create: a.domains.map((d) => ({ domain: d })) },
        plans: { create: a.plans },
      },
    });

    const feedbacks = buildFeedbacks(a);
    for (let i = 0; i < feedbacks.length; i++) {
      const src = sources[i % sources.length];
      const daysAgo = Math.floor((i / feedbacks.length) * 120); // spread over ~4 months
      await createFeedbackWithAnalysis({
        airportId: airport.id,
        rawContent: feedbacks[i],
        sourcePlatform: src.platform,
        dataSourceId: src.id,
        authorName: `user${i}`,
        publishedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      });
    }
    console.log(`已创建机场 ${a.name} 及 ${feedbacks.length} 条反馈`);
  }
  console.log("Seed 完成。");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
