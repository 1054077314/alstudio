import { notFound } from "next/navigation";
import Link from "next/link";
import { getAirportDetail } from "@/lib/airport";
import { buildAirportSummary } from "@/lib/summary";
import { DIMENSION_LABELS, WINDOWS, Dimension, RISK_LABELS } from "@/lib/constants";
import { RiskBadge, ScoreBar, ScorePill } from "@/components/ui";
import { TrendChart } from "@/components/TrendChart";
import { EvidenceBrowser } from "@/components/EvidenceBrowser";
import { billingLabel, formatDate, operationYears } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AirportDetailPage({ params }: { params: { slug: string } }) {
  const detail = await getAirportDetail(params.slug);
  if (!detail) notFound();

  const w = detail.scores.windows["30d"].composite != null ? detail.scores.windows["30d"] : detail.scores.windows["all"];
  const summary = buildAirportSummary(detail);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {detail.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={detail.logoUrl} alt={detail.name} className="h-12 w-12 rounded object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-blue-100 text-xl font-bold text-blue-700">
                {detail.name.slice(0, 1)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{detail.name}</h1>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                {detail.aliases.length > 0 && <span>别名：{detail.aliases.join("、")}</span>}
                {detail.oldNames.length > 0 && <span>曾用名：{detail.oldNames.join("、")}</span>}
                {detail.officialSite && (
                  <a href={detail.officialSite} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                    官网
                  </a>
                )}
                {detail.foundedAt && <span>运营 {operationYears(detail.foundedAt)}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              <ScorePill value={w.composite} />
            </div>
            <div className="text-xs text-gray-400">综合口碑 / 10</div>
            <div className="mt-2">
              <RiskBadge level={detail.scores.risk.level} />
            </div>
          </div>
        </div>
      </div>

      {/* Basic info (official data) */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">基础信息</h2>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">数据来源：机场官方（不参与口碑评分）</span>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <Info label="月最低价格" value={detail.minPrice != null ? `¥${detail.minPrice}` : "—"} />
          <Info label="最低套餐" value={detail.minPlanName || "—"} />
          <Info label="最低套餐流量" value={detail.minTraffic || "—"} />
          <Info label="支持月付" value={detail.monthlySupported ? "是" : "否"} />
          <Info label="设备限制" value={detail.deviceLimit || "未注明"} />
          <Info label="付款方式" value={detail.paymentMethods || "—"} />
          <Info label="节点地区" value={detail.nodeRegions || "—"} />
          <Info label="Netflix" value={detail.supportsNetflix ? "支持" : "未知"} />
          <Info label="ChatGPT" value={detail.supportsChatgpt ? "支持" : "未知"} />
        </dl>
        {detail.description && <p className="mt-3 text-sm text-gray-600">{detail.description}</p>}
      </section>

      {/* Plans */}
      {detail.plans.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">套餐</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2">名称</th>
                  <th className="px-3 py-2">价格</th>
                  <th className="px-3 py-2">周期</th>
                  <th className="px-3 py-2">流量</th>
                  <th className="px-3 py-2">设备</th>
                </tr>
              </thead>
              <tbody>
                {detail.plans.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">¥{p.price}</td>
                    <td className="px-3 py-2">{billingLabel(p.billingCycle)}</td>
                    <td className="px-3 py-2">{p.traffic || "—"}</td>
                    <td className="px-3 py-2">{p.deviceLimit ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reputation overview */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">综合口碑（用户反馈评分）</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold">
                  <ScorePill value={w.composite} />
                </div>
                <div className="text-xs text-gray-400">有效评价 {w.feedbackCount} 条</div>
              </div>
              <div className="text-xs">
                <div className="text-green-600">正面 {w.positivePct}%</div>
                <div className="text-gray-500">中性 {w.neutralPct}%</div>
                <div className="text-red-600">负面 {w.negativePct}%</div>
              </div>
            </div>
            <div className="space-y-2">
              {(Object.keys(DIMENSION_LABELS) as Dimension[]).map((d) => (
                <div key={d}>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="text-gray-600">{DIMENSION_LABELS[d]}</span>
                    <ScorePill value={(w as any)[d]} />
                  </div>
                  <ScoreBar value={(w as any)[d]} />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded bg-gray-50 p-3 text-sm text-gray-700">
            <p>{summary}</p>
            <p className="mt-2 text-[11px] text-gray-400">
              以上内容根据公开用户反馈自动整理，仅代表相关用户观点，不构成实测或购买建议。
            </p>
          </div>
        </div>
      </section>

      {/* Time windows */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">时间维度评分</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">时间窗口</th>
                <th className="px-3 py-2">综合</th>
                <th className="px-3 py-2">稳定性</th>
                <th className="px-3 py-2">速度</th>
                <th className="px-3 py-2">性价比</th>
                <th className="px-3 py-2">样本</th>
                <th className="px-3 py-2">可信度</th>
              </tr>
            </thead>
            <tbody>
              {WINDOWS.map((win) => {
                const s = detail.scores.windows[win.key];
                return (
                  <tr key={win.key} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-600">{win.label}</td>
                    <td className="px-3 py-2"><ScorePill value={s.composite} /></td>
                    <td className="px-3 py-2"><ScorePill value={s.stability} /></td>
                    <td className="px-3 py-2"><ScorePill value={s.speed} /></td>
                    <td className="px-3 py-2"><ScorePill value={s.value} /></td>
                    <td className="px-3 py-2 text-gray-500">{s.feedbackCount}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{s.confidenceLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {detail.scores.trend.note && (
          <p className="mt-2 text-sm text-gray-600">{detail.scores.trend.note}</p>
        )}
      </section>

      {/* Trend chart */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">口碑趋势（近 12 个月）</h2>
        <TrendChart data={detail.trendHistory} />
      </section>

      {/* Risk */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold">风险提示</h2>
          <RiskBadge level={detail.scores.risk.level} />
        </div>
        <p className="text-sm text-gray-700">{detail.scores.risk.message}</p>
        {detail.scores.risk.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {detail.scores.risk.tags.map((t) => (
              <span key={t} className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                {RISK_LABELS[t] || t}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* History events */}
      {detail.riskEvents.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">历史事件时间线</h2>
          <ul className="space-y-2">
            {detail.riskEvents.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="w-20 shrink-0 text-xs text-gray-400">{formatDate(e.eventDate)}</span>
                <div>
                  <span className={`mr-2 rounded px-1 text-[10px] ${e.type === "official" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                    {e.type === "official" ? "官方" : "用户反馈"}
                  </span>
                  <span className="font-medium">{e.title}</span>
                  {e.description && <p className="text-xs text-gray-500">{e.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Evidence */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">原始反馈证据</h2>
        <p className="mb-3 text-xs text-gray-400">
          所有评分结论均可追溯至以下公开反馈原文。可按月按维度筛选。
        </p>
        <EvidenceBrowser airportId={detail.id} />
      </section>

      <div className="text-center">
        <Link href="/airports" className="text-sm text-blue-500 hover:underline">
          ← 返回机场列表
        </Link>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}
