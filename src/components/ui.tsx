import Link from "next/link";
import { RiskLevel } from "@/lib/constants";
import { riskMeta, scoreColor, sentimentMeta } from "@/lib/format";

export function RiskBadge({ level }: { level: RiskLevel | string }) {
  const m = riskMeta(level);
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${m.className}`}>
      风险：{m.label}
    </span>
  );
}

export function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  const m = sentimentMeta(sentiment);
  return <span className={`text-xs font-medium ${m.className}`}>{m.label}</span>;
}

export function ScorePill({ value, label }: { value: number | null | undefined; label?: string }) {
  return (
    <span className={`font-semibold ${scoreColor(value)}`}>
      {label ? `${label} ` : ""}
      {value != null ? value.toFixed(1) : "—"}
    </span>
  );
}

export function ScoreBar({ value, max = 10 }: { value: number | null | undefined; max?: number }) {
  const pct = value != null ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color = value == null ? "bg-gray-200" : scoreColor(value).includes("green") ? "bg-green-500" : scoreColor(value).includes("blue") ? "bg-blue-500" : scoreColor(value).includes("yellow") ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="h-2 w-full rounded bg-gray-100">
      <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Tag({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "red" | "blue" | "yellow" }) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-700",
  };
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

export function AirportLink({ slug, name, logoUrl }: { slug: string; name: string; logoUrl?: string | null }) {
  return (
    <Link href={`/airports/${slug}`} className="flex items-center gap-2 font-medium text-gray-900 hover:text-blue-600">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-5 w-5 rounded object-contain" />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-700">
          {name.slice(0, 1)}
        </span>
      )}
      {name}
    </Link>
  );
}
