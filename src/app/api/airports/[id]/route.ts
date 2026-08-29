import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const airport = await prisma.airport.findUnique({
    where: { id: params.id },
    include: { aliases: true, domains: true, plans: true },
  });
  if (!airport) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(airport);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  for (const key of [
    "name",
    "slug",
    "logoUrl",
    "officialSite",
    "description",
    "minPrice",
    "minPlanName",
    "minTraffic",
    "monthlySupported",
    "deviceLimit",
    "paymentMethods",
    "nodeRegions",
    "supportsNetflix",
    "supportsChatgpt",
    "dataConfidence",
    "status",
    "mergedIntoId",
  ]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.foundedAt !== undefined) data.foundedAt = body.foundedAt ? new Date(body.foundedAt) : null;
  if (body.aliases !== undefined) {
    await prisma.airportAlias.deleteMany({ where: { airportId: params.id } });
    const aliases = [
      ...(body.aliases || []).map((v: string) => ({ type: "ALIAS", value: v })),
      ...(body.oldNames || []).map((v: string) => ({ type: "OLD_NAME", value: v })),
    ];
    data.aliases = { create: aliases };
  }
  if (body.domains !== undefined) {
    await prisma.airportDomain.deleteMany({ where: { airportId: params.id } });
    data.domains = { create: (body.domains || []).map((d: string) => ({ domain: d })) };
  }
  const airport = await prisma.airport.update({ where: { id: params.id }, data });
  return NextResponse.json(airport);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.airport.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
