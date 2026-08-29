import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  for (const key of ["eventDate", "title", "description", "type", "source", "sourceUrl"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (data.eventDate) data.eventDate = new Date(data.eventDate);
  const ev = await prisma.riskEvent.update({ where: { id: params.id }, data });
  return NextResponse.json(ev);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.riskEvent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
