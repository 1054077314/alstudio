import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.name || body.price == null)
    return NextResponse.json({ error: "name and price required" }, { status: 400 });
  const plan = await prisma.plan.create({
    data: {
      airportId: params.id,
      name: body.name,
      price: Number(body.price),
      billingCycle: body.billingCycle || "monthly",
      traffic: body.traffic || null,
      deviceLimit: body.deviceLimit ? Number(body.deviceLimit) : null,
      featured: !!body.featured,
    },
  });
  return NextResponse.json(plan, { status: 201 });
}
