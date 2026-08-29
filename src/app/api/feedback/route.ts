import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createFeedbackWithAnalysis } from "@/lib/feedback";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const where: any = {};
  if (searchParams.get("airportId")) where.airportId = searchParams.get("airportId");
  if (searchParams.get("status")) where.status = searchParams.get("status");
  else if (searchParams.get("public") === "1") where.status = { in: ["analyzed", "approved"] };
  if (searchParams.get("sentiment")) where.sentiment = searchParams.get("sentiment");
  if (searchParams.get("platform")) where.sourcePlatform = searchParams.get("platform");
  const dimension = searchParams.get("dimension");
  if (dimension) {
    const col = `ai${dimension.charAt(0).toUpperCase()}${dimension.slice(1)}`;
    where[col] = { not: null };
  }
  const limit = Number(searchParams.get("limit") || 100);
  const list = await prisma.feedback.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { crawledAt: "desc" }],
    take: Math.min(limit, 500),
    include: { dataSource: true, airport: { select: { id: true, name: true, slug: true } } },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.airportId || !body.rawContent)
    return NextResponse.json({ error: "airportId and rawContent required" }, { status: 400 });
  const fb = await createFeedbackWithAnalysis({
    airportId: body.airportId,
    rawContent: body.rawContent,
    sourcePlatform: body.sourcePlatform,
    dataSourceId: body.dataSourceId,
    originalUrl: body.originalUrl,
    authorName: body.authorName,
    authorId: body.authorId,
    authorMeta: body.authorMeta,
    publishedAt: body.publishedAt,
  });
  return NextResponse.json(fb, { status: 201 });
}
