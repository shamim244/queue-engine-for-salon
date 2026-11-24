import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Ticket } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Banknote, QrCode, Check, RefreshCw } from "lucide-react";

interface CheckoutModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onSuccess: (amount: number) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function CheckoutModal({
  ticket,
  onClose,
  onSuccess,
  showToast,
}: CheckoutModalProps) {
  const [checkoutAmount, setCheckoutAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH_PAID" | "ONLINE_PAID">("CASH_PAID");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ticket) {
      const netAmount = Math.max(0, (ticket.totalPrice ?? 100) - (ticket.couponDiscount || 0));
      setCheckoutAmount(netAmount);
      setPaymentMethod("CASH_PAID");
    }
  }, [ticket]);

  if (!ticket) return null;

  const isRewardOrZeroBill =
    Boolean(ticket.couponCode?.toUpperCase().startsWith("REW_")) || Number(checkoutAmount) <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.queue.finish(ticket.id, paymentMethod, Number(checkoutAmount));
      showToast(`Bill collected (₹${checkoutAmount}). Chair freed!`, "success");
      onSuccess(Number(checkoutAmount));
      onClose();
    } catch (err: any) {
      showToast("Failed to complete checkout: " + (err.message || "Unknown error"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(ticket)} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Complete Service & Collect Bill</DialogTitle>
          <DialogDescription>
            Ticket #{ticket.ticketNumber} · {ticket.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {ticket.couponCode && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-semibold">
                🎟️ Coupon {ticket.couponCode} applied
              </span>
              <span className="font-mono font-bold text-emerald-400">
                Bill ₹{ticket.totalPrice ?? 0} − ₹{ticket.couponDiscount || 0}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Final Bill Amount (₹)
            </label>
            <Input
              type="number"
              min={0}
              value={checkoutAmount}
              onChange={(e) => setCheckoutAmount(Number(e.target.value))}
              className="font-mono text-lg font-bold text-emerald-400 min-h-[44px]"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Service: {ticket.serviceName || "Haircut"}.{" "}
              {isRewardOrZeroBill
                ? "Reward redemption / ₹0 bill — does not add a loyalty stamp."
                : "Flexible pricing: adjust for cash discounts or add-ons."}
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Payment Collection Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH_PAID")}
                className={`p-3 rounded-xl border text-left transition-all min-h-[52px] ${
                  paymentMethod === "CASH_PAID"
                    ? "border-emerald-500 bg-emerald-500/15 text-white shadow-md shadow-emerald-500/10"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                }`}
              >
                <p className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 shrink-0" />
                  Cash Collected
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Paid directly to counter</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("ONLINE_PAID")}
                className={`p-3 rounded-xl border text-left transition-all min-h-[52px] ${
                  paymentMethod === "ONLINE_PAID"
                    ? "border-blue-500 bg-blue-500/15 text-white shadow-md shadow-blue-500/10"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                }`}
              >
                <p className="font-bold text-sm text-blue-400 flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 shrink-0" />
                  UPI / Online QR
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Scanned UPI payment</p>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 min-h-[44px]"
          >
            {submitting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Mark Paid & Free Seat
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
