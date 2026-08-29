import { prisma } from "@/lib/prisma";
import { AdminActions } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [airports, feedbacks, sources, events] = await Promise.all([
    prisma.airport.count(),
    prisma.feedback.count(),
    prisma.dataSource.count(),
    prisma.riskEvent.count(),
  ]);

  const stats = [
    { label: "机场", value: airports },
    { label: "反馈", value: feedbacks },
    { label: "数据源", value: sources },
    { label: "风险事件", value: events },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">管理后台 · 概览</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold">维护</h2>
        <AdminActions />
      </div>
    </div>
  );
}
