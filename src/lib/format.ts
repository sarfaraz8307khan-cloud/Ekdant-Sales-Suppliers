import { format } from "date-fns";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy, h:mm a");
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-IN");
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "INR"
): string {
  if (amount === null || amount === undefined) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatKm(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n.toLocaleString("en-IN")} km`;
}