import { RiskLevel } from "./constants";

export function riskMeta(level: RiskLevel | string): { label: string; className: string } {
  switch (level) {
    case "high":
      return { label: "高", className: "bg-red-100 text-red-700 border-red-300" };
    case "elevated":
      return { label: "较高", className: "bg-orange-100 text-orange-700 border-orange-300" };
    case "medium":
      return { label: "中", className: "bg-yellow-100 text-yellow-700 border-yellow-300" };
    case "low":
    default:
      return { label: "低", className: "bg-green-100 text-green-700 border-green-300" };
  }
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-gray-400";
  if (score >= 8) return "text-green-600";
  if (score >= 6.5) return "text-blue-600";
  if (score >= 5) return "text-yellow-600";
  return "text-red-600";
}

export function sentimentMeta(s: string | null): { label: string; className: string } {
  switch (s) {
    case "positive":
      return { label: "正面", className: "text-green-600" };
    case "negative":
      return { label: "负面", className: "text-red-600" };
    case "neutral":
    default:
      return { label: "中性", className: "text-gray-500" };
  }
}

export function billingLabel(cycle: string): string {
  switch (cycle) {
    case "monthly":
      return "月付";
    case "quarterly":
      return "季付";
    case "yearly":
      return "年付";
    default:
      return cycle;
  }
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

export function operationYears(foundedAt: Date | string | null | undefined): string {
  if (!foundedAt) return "未知";
  const dt = typeof foundedAt === "string" ? new Date(foundedAt) : foundedAt;
  const years = (Date.now() - dt.getTime()) / (365.25 * 86400000);
  if (years < 1) return `${Math.max(1, Math.round(years * 12))} 个月`;
  return `${years.toFixed(1)} 年`;
}
