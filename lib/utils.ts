import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number, decimals = 0): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 10_000) {
    return value.toLocaleString("zh-TW", { maximumFractionDigits: decimals });
  }
  return value.toLocaleString("zh-TW", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatChange(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}

// 台股：漲紅跌綠
export function pnlColor(value: number): string {
  if (value > 0) return "text-up";
  if (value < 0) return "text-down";
  return "text-neutral";
}

export function pnlBg(value: number): string {
  if (value > 0) return "bg-red-50 text-up";
  if (value < 0) return "bg-green-50 text-down";
  return "bg-slate-50 text-neutral";
}
