"use client";

import { useEffect, useState } from "react";

interface Fb {
  id: string;
  airportId: string;
  sourcePlatform: string;
  authorName: string | null;
  sentiment: string | null;
  status: string;
  promotionProbability: number | null;
  publishedAt: string | null;
  rawContent: string;
  airport?: { name: string };
}

export default function AdminFeedbacksPage() {
  const [airports, setAirports] = useState<{ id: string; name: string }[]>([]);
  const [list, setList] = useState<Fb[]>([]);
  const [airportId, setAirportId] = useState("");
  const [status, setStatus] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [form, setForm] = useState({
    airportId: "",
    sourcePlatform: "V2EX",
    originalUrl: "",
    authorName: "",
    publishedAt: "",
    rawContent: "",
  });

  async function loadAirports() {
    const r = await fetch("/api/airports?all=1");
    setAirports(await r.json());
  }
  async function load() {
    const p = new URLSearchParams();
    if (airportId) p.set("airportId", airportId);
    if (status) p.set("status", status);
    if (sentiment) p.set("sentiment", sentiment);
    p.set("limit", "200");
    const r = await fetch(`/api/feedback?${p.toString()}`);
    setList(await r.json());
  }
  useEffect(() => {
    loadAirports();
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, publishedAt: form.publishedAt || undefined }),
    });
    if (r.ok) {
      setForm({ airportId: "", sourcePlatform: "V2EX", originalUrl: "", authorName: "", publishedAt: "", rawContent: "" });
      load();
    } else alert("失败：" + (await r.text()));
  }

  async function analyze(id: string) {
    await fetch(`/api/feedback/${id}/analyze`, { method: "POST" });
    load();
  }
  async function setSt(id: string, s: string) {
    await fetch(`/api/feedback/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) });
    load();
  }
  async function del(id: string) {
    await fetch(`/api/feedback/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">反馈管理</h1>

      <form onSubmit={create} className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <select value={form.airportId} onChange={(e) => setForm({ ...form, airportId: e.target.value })} className="input" required>
            <option value="">选择机场</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <input value={form.sourcePlatform} onChange={(e) => setForm({ ...form, sourcePlatform: e.target.value })} placeholder="来源平台" className="input" />
          <input value={form.originalUrl} onChange={(e) => setForm({ ...form, originalUrl: e.target.value })} placeholder="原帖URL" className="input" />
          <input value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} placeholder="作者" className="input" />
          <input value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} type="date" className="input" />
        </div>
        <textarea value={form.rawContent} onChange={(e) => setForm({ ...form, rawContent: e.target.value })} placeholder="原始反馈内容" rows={3} className="input" required />
        <button type="submit" className="rounded bg-green-600 px-4 py-2 text-white">录入并分析</button>
      </form>

      <div className="flex flex-wrap gap-2 text-xs">
        <select value={airportId} onChange={(e) => { setAirportId(e.target.value); load(); }} className="input w-auto">
          <option value="">全部机场</option>
          {airports.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); load(); }} className="input w-auto">
          <option value="">全部状态</option>
          {["pending", "analyzed", "approved", "rejected", "promotion", "official"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sentiment} onChange={(e) => { setSentiment(e.target.value); load(); }} className="input w-auto">
          <option value="">全部情绪</option>
          <option value="positive">正面</option>
          <option value="neutral">中性</option>
          <option value="negative">负面</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-2 py-2">机场</th>
              <th className="px-2 py-2">来源</th>
              <th className="px-2 py-2">情绪</th>
              <th className="px-2 py-2">状态</th>
              <th className="px-2 py-2">内容</th>
              <th className="px-2 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((fb) => (
              <tr key={fb.id} className="border-t border-gray-100 align-top">
                <td className="px-2 py-2">{fb.airport?.name || fb.airportId}</td>
                <td className="px-2 py-2 text-xs">{fb.sourcePlatform}</td>
                <td className="px-2 py-2 text-xs">{fb.sentiment || "—"}</td>
                <td className="px-2 py-2 text-xs">{fb.status}</td>
                <td className="px-2 py-2 max-w-xs truncate text-xs text-gray-600" title={fb.rawContent}>{fb.rawContent}</td>
                <td className="px-2 py-2">
                  <div className="flex flex-col gap-1 text-xs">
                    <button onClick={() => analyze(fb.id)} className="text-blue-500 hover:underline">重新分析</button>
                    <button onClick={() => setSt(fb.id, fb.status === "approved" ? "analyzed" : "approved")} className="text-green-600 hover:underline">
                      {fb.status === "approved" ? "取消通过" : "通过"}
                    </button>
                    <button onClick={() => setSt(fb.id, "rejected")} className="text-orange-500 hover:underline">标记垃圾</button>
                    <button onClick={() => del(fb.id)} className="text-red-500 hover:underline">删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        .input { border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.375rem 0.5rem; outline: none; }
        .input:focus { border-color: #60a5fa; }
      `}</style>
    </div>
  );
}
