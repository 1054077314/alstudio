import Link from "next/link";

const ADMIN_NAV = [
  { href: "/admin", label: "概览" },
  { href: "/admin/airports", label: "机场管理" },
  { href: "/admin/feedbacks", label: "反馈管理" },
  { href: "/admin/data-sources", label: "数据源管理" },
  { href: "/admin/risk-events", label: "风险事件" },
  { href: "/admin/scoring", label: "评分配置" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <aside className="w-40 shrink-0">
        <nav className="space-y-1 text-sm">
          {ADMIN_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block rounded px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
