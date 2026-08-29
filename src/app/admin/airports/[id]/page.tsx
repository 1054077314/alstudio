"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function AdminAirportEditPage() {
  const params = useParams();
  const id = params.id as string;
  const [detail, setDetail] = useState<any>(null);
  const [f, setF] = useState<any>({});
  const [aliases, setAliases] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [plan, setPlan] = useState({ name: "", price: "", cycle: "monthly", traffic: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch(`/api/airports/${id}`);
    const d = await r.json();
    setDetail(d);
    setF({
      name: d.name,
      slug: d.slug,
      officialSite: d.officialSite || "",
      minPrice: d.minPrice ?? "",
      monthlySupported: d.monthlySupported,
      supportsNetflix: d.supportsNetflix,
      supportsChatgpt: d.supportsChatgpt,
      description: d.description || "",
      status: d.status,
    });
    setAliases(d.aliases.map((a: any) => a.value));
    setDomains(d.domains.map((a: any) => a.domain));
  }
  useEffect(() => {
    load();
  }, [id]);

  function set<K extends keyof typeof f>(k: K, v: any) {
    setF((x: any) => ({ ...x, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...f,
      minPrice: f.minPrice === "" ? null : Number(f.minPrice),
      aliases,
      domains,
    };
    const r = await fetch(`/api/airports/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setMsg(r.ok ? "已保存" : "保存失败");
  }

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/airports/${id}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: plan.name, price: Number(plan.price), billingCycle: plan.cycle, traffic: plan.traffic || undefined }),
    });
    setPlan({ name: "", price: "", cycle: "monthly", traffic: "" });
    load();
  }

  async function delPlan(pid: string) {
    await fetch(`/api/plans/${pid}`, { method: "DELETE" });
    load();
  }

  if (!detail) return <p className="text-sm text-gray-400">加载中…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">编辑机场：{detail.name}</h1>
      <form onSubmit={save} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <Lbl t="名称"><input value={f.name} onChange={(e) => set("name", e.target.value)} className="input" /></Lbl>
          <Lbl t="Slug"><input value={f.slug} onChange={(e) => set("slug", e.target.value)} className="input" /></Lbl>
          <Lbl t="官网"><input value={f.officialSite} onChange={(e) => set("officialSite", e.target.value)} className="input" /></Lbl>
          <Lbl t="月最低价"><input value={f.minPrice} onChange={(e) => set("minPrice", e.target.value)} type="number" className="input" /></Lbl>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1"><input type="checkbox" checked={f.monthlySupported} onChange={(e) => set("monthlySupported", e.target.checked)} /> 支持月付</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={f.supportsNetflix} onChange={(e) => set("supportsNetflix", e.target.checked)} /> Netflix</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={f.supportsChatgpt} onChange={(e) => set("supportsChatgpt", e.target.checked)} /> ChatGPT</label>
        </div>
        <Lbl t="简介"><textarea value={f.description} onChange={(e) => set("description", e.target.value)} className="input" rows={2} /></Lbl>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs text-gray-500">别名</p>
            <div className="flex flex-wrap gap-1">
              {aliases.map((a, i) => (
                <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{a} <button onClick={() => setAliases(aliases.filter((_, j) => j !== i))} className="text-red-500">×</button></span>
              ))}
            </div>
            <div className="mt-1 flex gap-1">
              <input value={newAlias} onChange={(e) => setNewAlias(e.target.value)} placeholder="新增别名" className="input" />
              <button type="button" onClick={() => { if (newAlias) { setAliases([...aliases, newAlias]); setNewAlias(""); } }} className="rounded bg-gray-200 px-2">+</button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-500">域名</p>
            <div className="flex flex-wrap gap-1">
              {domains.map((a, i) => (
                <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{a} <button onClick={() => setDomains(domains.filter((_, j) => j !== i))} className="text-red-500">×</button></span>
              ))}
            </div>
            <div className="mt-1 flex gap-1">
              <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="新增域名" className="input" />
              <button type="button" onClick={() => { if (newDomain) { setDomains([...domains, newDomain]); setNewDomain(""); } }} className="rounded bg-gray-200 px-2">+</button>
            </div>
          </div>
        </div>

        <button type="submit" className="rounded bg-green-600 px-4 py-2 text-white">保存修改</button>
        {msg && <span className="ml-2 text-xs text-gray-500">{msg}</span>}
      </form>

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <h2 className="mb-2 font-semibold">套餐</h2>
        <ul className="mb-3 space-y-1">
          {detail.plans.map((p: any) => (
            <li key={p.id} className="flex items-center gap-2 text-xs">
              <span>{p.name} · ¥{p.price} · {p.billingCycle} · {p.traffic || "—"}</span>
              <button onClick={() => delPlan(p.id)} className="text-red-500">删除</button>
            </li>
          ))}
        </ul>
        <form onSubmit={addPlan} className="grid grid-cols-4 gap-2">
          <input value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} placeholder="名称" className="input" />
          <input value={plan.price} onChange={(e) => setPlan({ ...plan, price: e.target.value })} placeholder="价格" type="number" className="input" />
          <select value={plan.cycle} onChange={(e) => setPlan({ ...plan, cycle: e.target.value })} className="input">
            <option value="monthly">月付</option>
            <option value="quarterly">季付</option>
            <option value="yearly">年付</option>
          </select>
          <input value={plan.traffic} onChange={(e) => setPlan({ ...plan, traffic: e.target.value })} placeholder="流量" className="input" />
          <button type="submit" className="col-span-4 rounded bg-blue-600 py-1.5 text-white">添加套餐</button>
        </form>
      </div>

      <style jsx global>{`
        .input { border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.375rem 0.5rem; width: 100%; outline: none; }
        .input:focus { border-color: #60a5fa; }
      `}</style>
    </div>
  );
}

function Lbl({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-gray-500">{t}</span>
      {children}
    </label>
  );
}
