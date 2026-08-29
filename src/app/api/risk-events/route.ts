import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.airportId || !body.title)
    return NextResponse.json({ error: "airportId and title required" }, { status: 400 });
  const ev = await prisma.riskEvent.create({
    data: {
      airportId: body.airportId,
      eventDate: body.eventDate ? new Date(body.eventDate) : new Date(),
      title: body.title,
      description: body.description || null,
      type: body.type || "user_feedback",
      source: body.source || null,
      sourceUrl: body.sourceUrl || null,
    },
  });
  return NextResponse.json(ev, { status: 201 });
}
