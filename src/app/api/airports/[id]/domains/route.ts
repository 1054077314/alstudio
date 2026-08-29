import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.domain) return NextResponse.json({ error: "domain required" }, { status: 400 });
  const domain = await prisma.airportDomain.create({
    data: { airportId: params.id, domain: body.domain },
  });
  return NextResponse.json(domain, { status: 201 });
}
