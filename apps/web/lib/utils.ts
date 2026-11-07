import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s\-\+]/g, "");
  // Ignore dummy placeholder phone numbers
  if (/^0+$/.test(cleaned) || cleaned === "919876500000" || cleaned === "9876500000" || cleaned.length < 5) {
    return "";
  }
  const rawWithPlus = phone.replace(/\s+/g, "");
  const start = rawWithPlus.slice(0, 5);
  const end = rawWithPlus.slice(-2);
  return `${start} *** ${end}`;
}

export function generateUpiUri(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}): string {
  const { upiId, payeeName, amount, note = "Salon Service" } = params;
  const cleanUpiId = (upiId || "").trim();
  const cleanPayee = (payeeName || "").trim();
  const formattedAmount = Number(amount || 0).toFixed(2);
  const cleanNote = (note || "Salon Service").trim();

  return `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(cleanPayee)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;
}

/**
 * Robust cross-timezone timestamp parser.
 * Handles MySQL DATETIME strings ('YYYY-MM-DD HH:mm:ss'), ISO strings, Date objects, and epoch timestamps.
 * Prevents UTC/IST local timezone offset double-shift (e.g., false +5h 30m / 330m overtime).
 */
export function parseTimestampMs(time?: string | Date | number | null): number {
  if (!time) return NaN;
  if (typeof time === "number") return time;
  if (time instanceof Date) return time.getTime();
  let s = String(time).trim();
  if (!s) return NaN;
  // If MySQL DATETIME string like '2026-11-07 15:58:09' without timezone offset or Z
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }
  return new Date(s).getTime();
}
