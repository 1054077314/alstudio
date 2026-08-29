import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "机场口碑 · VPN 机场用户反馈聚合",
  description: "基于公开互联网用户反馈的 VPN/代理机场口碑测评平台（非本站实测）",
};

const NAV = [
  { href: "/", label: "首页" },
  { href: "/airports", label: "机场列表" },
  { href: "/compare", label: "机场对比" },
  { href: "/admin", label: "管理后台" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-gray-900">
              机场口碑
            </Link>
            <nav className="flex gap-4 text-sm text-gray-600">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-blue-600">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="bg-amber-50 px-4 py-1 text-center text-xs text-amber-700">
            本站内容均来自公开互联网用户反馈的自动整理，仅代表相关用户观点，不构成本站实测，亦不构成购买建议。
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-gray-400">
          数据来源：公开社区用户反馈 · 本站不进行任何机场销售或代理
        </footer>
      </body>
    </html>
  );
}
