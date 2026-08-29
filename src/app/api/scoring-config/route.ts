import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const row =
    (await prisma.scoreConfig.findUnique({ where: { id: "singleton" } })) ??
    (await prisma.scoreConfig.create({ data: { id: "singleton" } }));
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const data: any = {};
  if (body.compositeWeights) {
    data.compositeWeights =
      typeof body.compositeWeights === "string" ? body.compositeWeights : JSON.stringify(body.compositeWeights);
  }
  if (body.timeDecay) {
    data.timeDecay = typeof body.timeDecay === "string" ? body.timeDecay : JSON.stringify(body.timeDecay);
  }
  const row = await prisma.scoreConfig.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  return NextResponse.json(row);
}
