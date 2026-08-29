import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json([]);
  const list = await prisma.airport.findMany({
    where: {
      status: "active",
      OR: [
        { name: { contains: q } },
        { aliases: { some: { value: { contains: q } } } },
        { domains: { some: { domain: { contains: q } } } },
      ],
    },
    select: { id: true, slug: true, name: true, logoUrl: true },
    take: 20,
  });
  return NextResponse.json(list);
}
