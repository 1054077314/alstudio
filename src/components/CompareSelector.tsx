"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Mini {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

export function CompareSelector({ airports, initial }: { airports: Mini[]; initial: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initial);
  const [q, setQ] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const go = () => {
    const qs = selected.join(",");
    router.push(qs ? `/compare?ids=${qs}` : "/compare");
  };

  const filtered = airports.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索机场加入对比（最多 4 个）"
        className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {selected.map((id) => {
          const a = airports.find((x) => x.id === id);
          return (
            <span key={id} className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
              {a?.name} <button onClick={() => toggle(id)} className="ml-1 text-blue-500">×</button>
            </span>
          );
        })}
      </div>
      <div className="max-h-60 space-y-1 overflow-y-auto">
        {filtered.map((a) => (
          <button
            key={a.id}
            onClick={() => toggle(a.id)}
            disabled={!selected.includes(a.id) && selected.length >= 4}
            className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-50 ${
              selected.includes(a.id) ? "bg-blue-50" : ""
            } disabled:opacity-40`}
          >
            {a.name}
          </button>
        ))}
      </div>
      <button onClick={go} className="mt-3 w-full rounded bg-blue-600 py-2 text-sm font-medium text-white">
        开始对比
      </button>
    </div>
  );
}
