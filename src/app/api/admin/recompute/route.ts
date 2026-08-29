import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAndStoreAnalysis } from "@/lib/feedback";

// Maintenance endpoint: re-run AI analysis + weight computation for all feedback.
export async function POST() {
  const rows = await prisma.feedback.findMany({ where: { status: { not: "rejected" } }, select: { id: true } });
  let ok = 0;
  for (const r of rows) {
    try {
      await computeAndStoreAnalysis(r.id);
      ok++;
    } catch {
      /* skip */
    }
  }
  return NextResponse.json({ processed: ok, total: rows.length });
}
