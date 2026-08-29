"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Airport {
  id: string;
  slug: string;
  name: string;
  officialSite: string | null;
  minPrice: number | null;
  monthlySupported: boolean;
  supportsNetflix: boolean;
  supportsChatgpt: boolean;
  status: string;
}

export default function AdminAirportsPage() {
  const [list, setList] = useState<Airport[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    officialSite: "",
    minPrice: "",
    monthlySupported: false,
    supportsNetflix: false,
    supportsChatgpt: false,
    description: "",
    aliases: "",
    domains: "",
    planName: "",
    planPrice: "",
    planCycle: "monthly",
    planTraffic: "",
  });

  async function load() {
    const r = await fetch("/api/airports?all=1");
    setList(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const body: any = {
      name: form.name,
      slug: form.slug || undefined,
      officialSite: form.officialSite || undefined,
      minPrice: form.minPrice ? Number(form.minPrice) : undefined,
      monthlySupported: form.monthlySupported,
      supportsNetflix: form.supportsNetflix,
      supportsChatgpt: form.supportsChatgpt,
      description: form.description || undefined,
      aliases: form.aliases.split(",").map((s) => s.trim()).filter(Boolean),
      domains: form.domains.split(",").map((s) => s.trim()).filter(Boolean),
    };
    if (form.planName && form.planPrice) {
      body.plans = [
        { name: form.planName, price: Number(form.planPrice), billingCycle: form.planCycle, traffic: form.planTraffic || undefined },
      ];
    }
    const r = await fetch("/api/airports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setShowForm(false);
      setForm({ name: "", slug: "", officialSite: "", minPrice: "", monthlySupported: false, supportsNetflix: false, supportsChatgpt: false, description: "", aliases: "", domains: "", planName: "", planPrice: "", planCycle: "monthly", planTraffic: "" });
      load();
    } else {
      alert("创建失败：" + (await r.text()));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">机场管理</h1>
        <button onClick={() => setShowForm((v) => !v)} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
          {showForm ? "收起" : "新增机场"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="名称 *"><input value={form.name} onChange={(e) => set("name", e.target.value)} required className="input" /></Field>
            <Field label="Slug"><input value={form.slug} onChange={(e) => set("slug", e.target.value)} className="input" placeholder="留空自动生成" /></Field>
            <Field label="官网"><input value={form.officialSite} onChange={(e) => set("officialSite", e.target.value)} className="input" /></Field>
            <Field label="月最低价"><input value={form.minPrice} onChange={(e) => set("minPrice", e.target.value)} type="number" className="input" /></Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.monthlySupported} onChange={(e) => set("monthlySupported", e.target.checked)} /> 支持月付</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.supportsNetflix} onChange={(e) => set("supportsNetflix", e.target.checked)} /> Netflix</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.supportsChatgpt} onChange={(e) => set("supportsChatgpt", e.target.checked)} /> ChatGPT</label>
          </div>
          <Field label="别名（逗号分隔）"><input value={form.aliases} onChange={(e) => set("aliases", e.target.value)} className="input" /></Field>
          <Field label="域名（逗号分隔）"><input value={form.domains} onChange={(e) => set("domains", e.target.value)} className="input" /></Field>
          <Field label="简介"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="input" rows={2} /></Field>
          <div className="rounded border border-dashed border-gray-300 p-3">
            <p className="mb-2 text-xs text-gray-500">初始套餐（可选）</p>
            <div className="grid grid-cols-4 gap-2">
              <input value={form.planName} onChange={(e) => set("planName", e.target.value)} placeholder="名称" className="input" />
              <input value={form.planPrice} onChange={(e) => set("planPrice", e.target.value)} placeholder="价格" type="number" className="input" />
              <select value={form.planCycle} onChange={(e) => set("planCycle", e.target.value)} className="input">
                <option value="monthly">月付</option>
                <option value="quarterly">季付</option>
                <option value="yearly">年付</option>
              </select>
              <input value={form.planTraffic} onChange={(e) => set("planTraffic", e.target.value)} placeholder="流量" className="input" />
            </div>
          </div>
          <button type="submit" className="rounded bg-green-600 px-4 py-2 text-white">保存</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">名称</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">月价</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2 text-gray-400">{a.slug}</td>
                <td className="px-3 py-2">{a.minPrice != null ? `¥${a.minPrice}` : "—"}</td>
                <td className="px-3 py-2 text-xs">{a.status}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/airports/${a.id}`} className="text-blue-500 hover:underline">编辑</Link>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-gray-500">{label}</span>
      {children}
    </label>
  );
}
