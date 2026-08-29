import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAirportScores } from "@/lib/scoring";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (ids.length === 0) return NextResponse.json([]);

  const airports = await prisma.airport.findMany({
    where: { id: { in: ids } },
    include: { plans: true },
  });

  const out = [];
  for (const a of airports) {
    const scores = await computeAirportScores(a.id);
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
      scores,
    });
  }
  return NextResponse.json(out);
}
