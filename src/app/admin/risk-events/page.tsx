"use client";

import { useEffect, useState } from "react";

interface Ev {
  id: string;
  airportId: string;
  title: string;
  eventDate: string;
  type: string;
  description: string | null;
}

export default function AdminRiskEventsPage() {
  const [airports, setAirports] = useState<{ id: string; name: string }[]>([]);
  const [list, setList] = useState<Ev[]>([]);
  const [form, setForm] = useState({ airportId: "", title: "", eventDate: "", type: "user_feedback", description: "", source: "" });

  async function loadAirports() {
    const r = await fetch("/api/airports?all=1");
    setAirports(await r.json());
  }
  async function load() {
    const r = await fetch("/api/risk-events");
    setList(await r.json());
  }
  useEffect(() => { loadAirports(); load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/risk-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, eventDate: form.eventDate || undefined }),
    });
    if (r.ok) { setForm({ airportId: "", title: "", eventDate: "", type: "user_feedback", description: "", source: "" }); load(); }
  }
  async function del(id: string) {
    await fetch(`/api/risk-events/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">风险事件</h1>
      <form onSubmit={create} className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <select value={form.airportId} onChange={(e) => setForm({ ...form, airportId: e.target.value })} className="input" required>
          <option value="">选择机场</option>
          {airports.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="事件标题" className="input" required />
        <input value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} type="date" className="input" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
          <option value="user_feedback">用户集中反馈</option>
          <option value="official">官方事件</option>
        </select>
        <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="来源" className="input" />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="描述" className="input" />
        <button type="submit" className="col-span-2 rounded bg-green-600 py-2 text-white">新增事件</button>
      </form>

      <ul className="space-y-2">
        {list.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
            <div>
              <span className="font-medium">{e.title}</span>
              <span className="ml-2 text-xs text-gray-400">{e.eventDate?.slice(0, 10)} · {e.type}</span>
            </div>
            <button onClick={() => del(e.id)} className="text-red-500 hover:underline text-xs">删除</button>
          </li>
        ))}
      </ul>

      <style jsx global>{`
        .input { border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.375rem 0.5rem; width: 100%; outline: none; }
        .input:focus { border-color: #60a5fa; }
      `}</style>
    </div>
  );
}
