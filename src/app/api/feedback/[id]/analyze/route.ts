import { NextRequest, NextResponse } from "next/server";
import { computeAndStoreAnalysis } from "@/lib/feedback";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const fb = await computeAndStoreAnalysis(params.id);
  if (!fb) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(fb);
}
