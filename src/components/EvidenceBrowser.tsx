"use client";

import { useEffect, useState } from "react";
import { DIMENSION_LABELS, Dimension, RISK_LABELS, SERVICE_LABELS, PRICE_LABELS, UNLOCK_LABELS, REGION_LABELS } from "@/lib/constants";

interface EvidenceRow {
  id: string;
  sourcePlatform: string;
  originalUrl: string | null;
  authorName: string | null;
  publishedAt: string | null;
  processedContent: string | null;
  rawContent: string;
  sentiment: string | null;
  aiStability: number | null;
  aiSpeed: number | null;
  aiValue: number | null;
  regionTags: Record<string, string> | null;
  serviceTags: string[];
  priceTags: string[];
  unlockTags: string[];
  riskTags: string[];
  promotionProbability: number | null;
  computedWeight: number | null;
}

const DIMENSIONS = Object.keys(DIMENSION_LABELS) as Dimension[];

function tagLabel(map: Record<string, string>, key: string) {
  return map[key] || key;
}

export function EvidenceBrowser({ airportId }: { airportId: string }) {
  const [sentiment, setSentiment] = useState("");
  const [dimension, setDimension] = useState("");
  const [rows, setRows] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ airportId, limit: "50", public: "1" });
    if (sentiment) params.set("sentiment", sentiment);
    if (dimension) params.set("dimension", dimension);
    fetch(`/api/feedback?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setRows(Array.isArray(d) ? d : []);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [airportId, sentiment, dimension]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <select value={sentiment} onChange={(e) => setSentiment(e.target.value)} className="rounded border border-gray-300 px-2 py-1">
          <option value="">全部情绪</option>
          <option value="positive">正面</option>
          <option value="neutral">中性</option>
          <option value="negative">负面</option>
        </select>
        <select value={dimension} onChange={(e) => setDimension(e.target.value)} className="rounded border border-gray-300 px-2 py-1">
          <option value="">全部维度</option>
          {DIMENSIONS.map((d) => (
            <option key={d} value={d}>
              {DIMENSION_LABELS[d]}
            </option>
          ))}
        </select>
        <span className="self-center text-gray-400">共 {rows.length} 条</span>
      </div>

      {loading && <p className="text-xs text-gray-400">加载中…</p>}
      {!loading && rows.length === 0 && <p className="text-xs text-gray-400">没有符合条件的反馈。</p>}

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{r.sourcePlatform}</span>
              {r.authorName && <span>· {r.authorName}</span>}
              {r.publishedAt && <span>· {r.publishedAt.slice(0, 10)}</span>}
              <span
                className={
                  r.sentiment === "positive" ? "text-green-600" : r.sentiment === "negative" ? "text-red-600" : "text-gray-400"
                }
              >
                · {r.sentiment === "positive" ? "正面" : r.sentiment === "negative" ? "负面" : "中性"}
              </span>
              {r.promotionProbability != null && r.promotionProbability > 0.5 && (
                <span className="rounded bg-orange-100 px-1 text-orange-600">疑似推广</span>
              )}
              {r.originalUrl && (
                <a href={r.originalUrl} target="_blank" rel="noreferrer" className="ml-auto text-blue-500 hover:underline">
                  查看原帖
                </a>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{r.processedContent || r.rawContent}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {r.regionTags &&
                Object.entries(r.regionTags).map(([k, v]) => (
                  <span key={k} className={`rounded px-1 text-[10px] ${v === "negative" ? "bg-red-100 text-red-600" : v === "positive" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {REGION_LABELS[k] || k}:{v === "negative" ? "负" : v === "positive" ? "正" : "中"}
                  </span>
                ))}
              {r.serviceTags.map((t) => (
                <span key={t} className="rounded bg-blue-50 px-1 text-[10px] text-blue-600">
                  {SERVICE_LABELS[t] || t}
                </span>
              ))}
              {r.priceTags.map((t) => (
                <span key={t} className="rounded bg-yellow-50 px-1 text-[10px] text-yellow-700">
                  {PRICE_LABELS[t] || t}
                </span>
              ))}
              {r.unlockTags.map((t) => (
                <span key={t} className="rounded bg-purple-50 px-1 text-[10px] text-purple-600">
                  {UNLOCK_LABELS[t] || t}
                </span>
              ))}
              {r.riskTags.map((t) => (
                <span key={t} className="rounded bg-red-100 px-1 text-[10px] text-red-700">
                  {RISK_LABELS[t] || t}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
