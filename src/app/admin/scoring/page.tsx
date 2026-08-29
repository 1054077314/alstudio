"use client";

import { useEffect, useState } from "react";

export default function AdminScoringPage() {
  const [composite, setComposite] = useState("");
  const [decay, setDecay] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/scoring-config").then((r) => r.json()).then((d) => {
      setComposite(d.compositeWeights || "");
      setDecay(d.timeDecay || "");
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    let cw: any, td: any;
    try {
      cw = JSON.parse(composite);
    } catch {
      return setMsg("综合权重不是合法 JSON");
    }
    try {
      td = JSON.parse(decay);
    } catch {
      return setMsg("时间衰减不是合法 JSON");
    }
    const r = await fetch("/api/scoring-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compositeWeights: cw, timeDecay: td }),
    });
    setMsg(r.ok ? "已保存" : "保存失败");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">评分配置</h1>
      <form onSubmit={save} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <div>
          <p className="mb-1 text-xs text-gray-500">综合评分维度权重（稳定性30/速度20/性价比20/节点质量10/客服10/流媒体10）</p>
          <textarea value={composite} onChange={(e) => setComposite(e.target.value)} rows={3} className="input font-mono" />
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">时间衰减（天→倍率）</p>
          <textarea value={decay} onChange={(e) => setDecay(e.target.value)} rows={3} className="input font-mono" />
        </div>
        <button type="submit" className="rounded bg-green-600 px-4 py-2 text-white">保存</button>
        {msg && <span className="ml-2 text-xs text-gray-500">{msg}</span>}
      </form>

      <style jsx global>{`
        .input { border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.375rem 0.5rem; width: 100%; outline: none; font-family: monospace; }
        .input:focus { border-color: #60a5fa; }
      `}</style>
    </div>
  );
}
