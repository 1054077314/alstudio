"use client";

import { useEffect, useState } from "react";

interface Ds {
  id: string;
  platform: string;
  url: string | null;
  kind: string;
  credibilityWeight: number;
  crawlStatus: string;
}

export default function AdminDataSourcesPage() {
  const [list, setList] = useState<Ds[]>([]);
  const [form, setForm] = useState({ platform: "", url: "", kind: "community", credibilityWeight: "0.6", crawlStatus: "manual" });

  async function load() {
    const r = await fetch("/api/data-sources");
    setList(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, credibilityWeight: Number(form.credibilityWeight) }),
    });
    if (r.ok) { setForm({ platform: "", url: "", kind: "community", credibilityWeight: "0.6", crawlStatus: "manual" }); load(); }
  }

  async function update(id: string, credibilityWeight: number) {
    await fetch(`/api/data-sources/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credibilityWeight }) });
    load();
  }
  async function del(id: string) {
    await fetch(`/api/data-sources/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">数据源管理</h1>
      <form onSubmit={create} className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="平台（V2EX/Reddit…）" className="input" required />
        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL" className="input" />
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="input">
          <option value="community">社区</option>
          <option value="blog">博客</option>
          <option value="official">官方</option>
          <option value="review_blog">评测博客</option>
          <option value="nav">导航站</option>
        </select>
        <input value={form.credibilityWeight} onChange={(e) => setForm({ ...form, credibilityWeight: e.target.value })} type="number" step="0.1" placeholder="可信度权重" className="input" />
        <button type="submit" className="col-span-2 rounded bg-green-600 py-2 text-white">新增数据源</button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">平台</th>
              <th className="px-3 py-2">类型</th>
              <th className="px-3 py-2">可信度权重</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{d.platform}</td>
                <td className="px-3 py-2 text-xs">{d.kind}</td>
                <td className="px-3 py-2">
                  <input type="number" step="0.1" defaultValue={d.credibilityWeight} onBlur={(e) => update(d.id, Number(e.target.value))} className="w-16 rounded border border-gray-300 px-1" />
                </td>
                <td className="px-3 py-2 text-xs">{d.crawlStatus}</td>
                <td className="px-3 py-2">
                  <button onClick={() => del(d.id)} className="text-red-500 hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        .input { border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.375rem 0.5rem; width: 100%; outline: none; }
        .input:focus { border-color: #60a5fa; }
      `}</style>
    </div>
  );
}
