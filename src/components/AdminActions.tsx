"use client";

import { useState } from "react";

export function AdminActions() {
  const [status, setStatus] = useState("");
  async function recompute() {
    setStatus("运行中…");
    const r = await fetch("/api/admin/recompute", { method: "POST" });
    const d = await r.json();
    setStatus(`完成：处理 ${d.processed}/${d.total} 条`);
  }
  return (
    <div className="flex items-center gap-3">
      <button onClick={recompute} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
        重新计算全部反馈权重
      </button>
      {status && <span className="text-xs text-gray-500">{status}</span>}
    </div>
  );
}
