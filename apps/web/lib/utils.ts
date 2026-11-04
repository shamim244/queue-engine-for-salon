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

export function maskPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.length <= 4) return cleaned;
  const start = cleaned.slice(0, Math.max(3, cleaned.length - 4));
  const end = cleaned.slice(-2);
  return `${cleaned.slice(0, 5)} *** ${end}`;
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
