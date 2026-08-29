import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.value) return NextResponse.json({ error: "value required" }, { status: 400 });
  const alias = await prisma.airportAlias.create({
    data: { airportId: params.id, type: body.type || "ALIAS", value: body.value },
  });
  return NextResponse.json(alias, { status: 201 });
}
