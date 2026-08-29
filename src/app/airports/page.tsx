import { Suspense } from "react";
import { getAirportSummaries } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";
import { ListControls } from "@/components/ListControls";
import { AirportLink, RiskBadge, ScorePill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AirportListPage({
  searchParams,
}: {
  searchParams: { q?: string; netflix?: string; chatgpt?: string; monthly?: string; sort?: string };
}) {
  let summaries = await getAirportSummaries();

  if (searchParams.q) {
    const ids = await prisma.airport.findMany({
      where: {
        OR: [
          { name: { contains: searchParams.q } },
          { aliases: { some: { value: { contains: searchParams.q } } } },
          { domains: { some: { domain: { contains: searchParams.q } } } },
        ],
      },
      select: { id: true },
    });
    const idSet = new Set(ids.map((x) => x.id));
    summaries = summaries.filter((s) => idSet.has(s.id));
  }

  if (searchParams.netflix === "1") summaries = summaries.filter((s) => s.supportsNetflix);
  if (searchParams.chatgpt === "1") summaries = summaries.filter((s) => s.supportsChatgpt);
  if (searchParams.monthly === "1") summaries = summaries.filter((s) => s.monthlySupported);

  const sort = searchParams.sort || "composite";
  summaries.sort((a, b) => {
    switch (sort) {
      case "trend":
        return (b.trendDelta ?? 0) - (a.trendDelta ?? 0);
      case "feedback":
        return (b.feedbackCount ?? 0) - (a.feedbackCount ?? 0);
      case "price":
        return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
      case "value":
        return (b.value ?? 0) - (a.value ?? 0);
      default:
        return (b.composite ?? 0) - (a.composite ?? 0);
    }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">机场列表</h1>
      <Suspense fallback={<div className="text-sm text-gray-400">加载筛选器…</div>}>
        <ListControls />
      </Suspense>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">机场</th>
              <th className="px-3 py-2">综合口碑</th>
              <th className="px-3 py-2">稳定性</th>
              <th className="px-3 py-2">性价比</th>
              <th className="px-3 py-2">月最低价</th>
              <th className="px-3 py-2">风险</th>
              <th className="px-3 py-2">反馈</th>
              <th className="px-3 py-2">趋势</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  暂无匹配的机场
                </td>
              </tr>
            ) : (
              summaries.map((a, i) => (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-300">{i + 1}</span>
                      <AirportLink slug={a.slug} name={a.name} logoUrl={a.logoUrl} />
                      <span className="flex gap-1">
                        {a.supportsNetflix && <span className="text-[10px] text-red-500">NF</span>}
                        {a.supportsChatgpt && <span className="text-[10px] text-emerald-500">GPT</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <ScorePill value={a.composite} />
                  </td>
                  <td className="px-3 py-2">
                    <ScorePill value={a.stability} />
                  </td>
                  <td className="px-3 py-2">
                    <ScorePill value={a.value} />
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {a.minPrice != null ? `¥${a.minPrice.toFixed(0)}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <RiskBadge level={a.riskLevel} />
                  </td>
                  <td className="px-3 py-2 text-gray-500">{a.feedbackCount}</td>
                  <td className="px-3 py-2">
                    <span className={a.trendDirection === "down" ? "font-semibold text-red-600" : a.trendDirection === "up" ? "text-green-600" : "text-gray-400"}>
                      {a.trendDelta != null
                        ? a.trendDelta > 0
                          ? `↑${a.trendDelta.toFixed(1)}`
                          : a.trendDelta < 0
                            ? `↓${Math.abs(a.trendDelta).toFixed(1)}`
                            : "—"
                        : "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
