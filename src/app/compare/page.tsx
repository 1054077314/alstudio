import { prisma } from "@/lib/prisma";
import { computeAirportScores } from "@/lib/scoring";
import { CompareSelector } from "@/components/CompareSelector";
import { RiskBadge, ScorePill } from "@/components/ui";
import { DIMENSION_LABELS, Dimension } from "@/lib/constants";
import { billingLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { ids?: string };
}) {
  const ids = (searchParams.ids || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);

  const allAirports = await prisma.airport.findMany({
    where: { status: "active" },
    select: { id: true, slug: true, name: true, logoUrl: true },
    orderBy: { name: "asc" },
  });

  const selected = [];
  for (const id of ids) {
    const a = await prisma.airport.findUnique({
      where: { id },
      include: { plans: true },
    });
    if (!a) continue;
    const scores = await computeAirportScores(a.id);
    const w = scores.windows["30d"].composite != null ? scores.windows["30d"] : scores.windows["all"];
    const monthly = a.plans.find((p) => p.billingCycle === "monthly");
    selected.push({ a, scores, w, monthly });
  }

  const rows: { label: string; get: (s: (typeof selected)[number]) => React.ReactNode }[] = [
    { label: "综合口碑(30天)", get: (s) => <ScorePill value={s.w.composite} /> },
    { label: "稳定性", get: (s) => <ScorePill value={s.w.stability} /> },
    { label: "速度", get: (s) => <ScorePill value={s.w.speed} /> },
    { label: "性价比", get: (s) => <ScorePill value={s.w.value} /> },
    { label: "客服", get: (s) => <ScorePill value={s.w.customerService} /> },
    { label: "节点质量", get: (s) => <ScorePill value={s.w.nodeQuality} /> },
    { label: "流媒体/AI", get: (s) => <ScorePill value={s.w.unlock} /> },
    { label: "风险", get: (s) => <RiskBadge level={s.scores.risk.level} /> },
    { label: "有效反馈", get: (s) => <span className="text-gray-600">{s.w.feedbackCount} 条</span> },
    {
      label: "月最低价",
      get: (s) => <span className="text-gray-700">{s.monthly ? `¥${s.monthly.price}/${billingLabel("monthly")}` : "—"}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">机场对比</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <CompareSelector airports={allAirports} initial={ids} />
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          {selected.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">请选择至少 1 个机场进行对比</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-400">指标</th>
                  {selected.map((s) => (
                    <th key={s.a.id} className="px-3 py-2 text-left font-semibold">
                      {s.a.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-xs text-gray-500">{row.label}</td>
                    {selected.map((s) => (
                      <td key={s.a.id} className="px-3 py-2">
                        {row.get(s)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
