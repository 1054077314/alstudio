import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  for (const key of ["platform", "url", "kind", "credibilityWeight", "crawlStatus", "notes", "lastCrawledAt"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (data.credibilityWeight != null) data.credibilityWeight = Number(data.credibilityWeight);
  const ds = await prisma.dataSource.update({ where: { id: params.id }, data });
  return NextResponse.json(ds);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.dataSource.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
