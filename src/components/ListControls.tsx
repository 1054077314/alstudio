"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function ListControls() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");

  function push(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `/airports?${qs}` : "/airports");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    push(next);
  }

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    push(next);
  }

  function setSort(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("sort", value);
    push(next);
  }

  const sort = params.get("sort") || "composite";

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索机场名 / 别名 / 域名"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          搜索
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={params.get("netflix") === "1"} onChange={() => toggle("netflix", "1")} />
          支持 Netflix
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={params.get("chatgpt") === "1"} onChange={() => toggle("chatgpt", "1")} />
          支持 ChatGPT
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={params.get("monthly") === "1"} onChange={() => toggle("monthly", "1")} />
          支持月付
        </label>
        <span className="ml-auto flex items-center gap-1 text-gray-500">
          排序
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded border border-gray-300 px-2 py-1">
            <option value="composite">综合评分</option>
            <option value="trend">最近30天评分</option>
            <option value="feedback">反馈数量</option>
            <option value="price">最低价格</option>
            <option value="value">性价比</option>
            <option value="founded">运营时间</option>
          </select>
        </span>
      </div>
    </div>
  );
}
