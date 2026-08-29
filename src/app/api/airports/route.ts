import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAirportSummaries } from "@/lib/scoring";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `airport-${Date.now()}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const all = searchParams.get("all") === "1";
  const netflix = searchParams.get("netflix") === "1";
  const chatgpt = searchParams.get("chatgpt") === "1";

  if (q || netflix || chatgpt || all) {
    const where: any = {};
    if (!all) where.status = "active";
    if (netflix) where.supportsNetflix = true;
    if (chatgpt) where.supportsChatgpt = true;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { aliases: { some: { value: { contains: q } } } },
        { domains: { some: { domain: { contains: q } } } },
      ];
    }
    const list = await prisma.airport.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json(list);
  }

  // Default: ranking-ready summaries with computed scores.
  const summaries = await getAirportSummaries();
  return NextResponse.json(summaries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const slug = body.slug?.trim() || slugify(body.name);
  const exists = await prisma.airport.findUnique({ where: { slug } });
  if (exists) return NextResponse.json({ error: "slug already exists" }, { status: 409 });

  const aliases = [
    ...(body.aliases || []).map((v: string) => ({ type: "ALIAS", value: v })),
    ...(body.oldNames || []).map((v: string) => ({ type: "OLD_NAME", value: v })),
  ];
  const plans = (body.plans || []).map((p: any) => ({
    name: p.name,
    price: Number(p.price),
    billingCycle: p.billingCycle || "monthly",
    traffic: p.traffic || null,
    deviceLimit: p.deviceLimit ? Number(p.deviceLimit) : null,
    featured: !!p.featured,
  }));

  const airport = await prisma.airport.create({
    data: {
      name: body.name,
      slug,
      logoUrl: body.logoUrl || null,
      officialSite: body.officialSite || null,
      foundedAt: body.foundedAt ? new Date(body.foundedAt) : null,
      description: body.description || null,
      minPrice: body.minPrice != null ? Number(body.minPrice) : null,
      minPlanName: body.minPlanName || null,
      minTraffic: body.minTraffic || null,
      monthlySupported: !!body.monthlySupported,
      deviceLimit: body.deviceLimit || null,
      paymentMethods: body.paymentMethods || null,
      nodeRegions: body.nodeRegions || null,
      supportsNetflix: !!body.supportsNetflix,
      supportsChatgpt: !!body.supportsChatgpt,
      aliases: { create: aliases },
      domains: { create: (body.domains || []).map((d: string) => ({ domain: d })) },
      plans: { create: plans },
    },
    include: { aliases: true, domains: true, plans: true },
  });
  return NextResponse.json(airport, { status: 201 });
}
