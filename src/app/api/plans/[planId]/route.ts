import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { planId: string } }) {
  const body = await req.json();
  const data: any = {};
  for (const key of ["name", "price", "billingCycle", "traffic", "deviceLimit", "featured"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  const plan = await prisma.plan.update({ where: { id: params.planId }, data });
  return NextResponse.json(plan);
}

export async function DELETE(_req: NextRequest, { params }: { params: { planId: string } }) {
  await prisma.plan.delete({ where: { id: params.planId } });
  return NextResponse.json({ ok: true });
}
