import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAndStoreAnalysis } from "@/lib/feedback";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const fb = await prisma.feedback.findUnique({
    where: { id: params.id },
    include: { dataSource: true, airport: { select: { id: true, name: true, slug: true } } },
  });
  if (!fb) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(fb);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  for (const key of [
    "rawContent",
    "processedContent",
    "sourcePlatform",
    "originalUrl",
    "authorName",
    "authorId",
    "authorMeta",
    "sentiment",
    "status",
    "publishedAt",
  ]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  const fb = await prisma.feedback.update({ where: { id: params.id }, data });
  return NextResponse.json(fb);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.feedback.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
