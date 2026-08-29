import { getBoards } from "@/lib/rankings";
import { RankingBoard } from "@/components/RankingBoard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { boards, summaries } = await getBoards();
  const totalAirports = summaries.length;
  const totalFeedback = summaries.reduce((s, a) => s + (a.feedbackCount ?? 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">VPN 机场口碑榜</h1>
        <p className="mt-1 text-sm text-gray-500">
          已收录 {totalAirports} 个机场 · 有效反馈 {totalFeedback} 条 · 全部来自公开社区用户反馈
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RankingBoard title="综合口碑排行" items={boards.composite} metric="composite" />
        <RankingBoard title="稳定性排行" items={boards.stability} metric="stability" />
        <RankingBoard title="性价比排行" items={boards.value} metric="value" />
        <RankingBoard title="低价机场排行" items={boards.lowPrice} metric="minPrice" />
        <RankingBoard title="最近口碑上升" items={boards.rising} metric="trend" />
        <RankingBoard title="最近口碑下降" items={boards.falling} metric="trend" />
        <RankingBoard title="风险较高机场" items={boards.risk} metric="risk" />
        <RankingBoard title="反馈最多的机场" items={boards.oldBrand} metric="composite" />
      </div>
    </div>
  );
}
