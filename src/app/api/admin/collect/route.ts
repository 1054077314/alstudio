import { NextRequest, NextResponse } from "next/server";
import { runCollection } from "@/lib/collect";

// Trigger endpoint for scheduled collection. Secure this behind auth/cron in production.
export async function POST() {
  const results = await runCollection();
  return NextResponse.json({ ran: results.length, results });
}
