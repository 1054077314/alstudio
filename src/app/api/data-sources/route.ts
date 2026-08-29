import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const list = await prisma.dataSource.findMany({ orderBy: { platform: "asc" } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.platform) return NextResponse.json({ error: "platform required" }, { status: 400 });
  const ds = await prisma.dataSource.create({
    data: {
      platform: body.platform,
      url: body.url || null,
      kind: body.kind || "community",
      credibilityWeight: body.credibilityWeight != null ? Number(body.credibilityWeight) : 0.6,
      crawlStatus: body.crawlStatus || "manual",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(ds, { status: 201 });
}
