"use client";

import React, { useState, useEffect } from "react";
import type { Ticket } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { CheckCircle2, Banknote, QrCode, IndianRupee } from "lucide-react";

interface StaffPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onConfirmPayment: (paymentStatus: "CASH_PAID" | "ONLINE_PAID", finalAmount: number) => Promise<void>;
  isLoading?: boolean;
}

export function StaffPaymentModal({
  isOpen,
  onClose,
  ticket,
  onConfirmPayment,
  isLoading = false,
}: StaffPaymentModalProps) {
  const [paymentMode, setPaymentMode] = useState<"CASH_PAID" | "ONLINE_PAID">("CASH_PAID");
  const [finalAmount, setFinalAmount] = useState<number>(100);
  const [tenderAmount, setTenderAmount] = useState<number>(100);

  useEffect(() => {
    if (ticket) {
      const amount = ticket.totalPrice || 100;
      setFinalAmount(amount);
      setTenderAmount(amount);
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const changeDue = Math.max(0, tenderAmount - finalAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic("complete");
    await onConfirmPayment(paymentMode, finalAmount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        {/* Modal Body */}
        <div className="relative z-50 w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in-0 zoom-in-95 duration-150">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>Complete Service &amp; Collect</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Ticket #{ticket.ticketNumber} • {ticket.customerName} ({ticket.serviceName})
            </DialogDescription>
          </DialogHeader>

          {/* Amount Box */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Bill Amount</span>
            <div className="flex items-center gap-1 font-mono text-2xl font-black text-emerald-400">
              <IndianRupee className="h-5 w-5" />
              <span>{finalAmount}</span>
            </div>
          </div>

          {/* Payment Method Switcher (Cash vs UPI) */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Payment Method
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("tap");
                  setPaymentMode("CASH_PAID");
                }}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[48px] ${
                  paymentMode === "CASH_PAID"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>Cash Payment</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("tap");
                  setPaymentMode("ONLINE_PAID");
                }}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[48px] ${
                  paymentMode === "ONLINE_PAID"
                    ? "bg-purple-500/20 border-purple-500 text-purple-300 ring-1 ring-purple-500/50"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span>UPI / QR Scan</span>
              </button>
            </div>
          </div>

          {/* Cash Tender Presets */}
          {paymentMode === "CASH_PAID" && (
            <div className="space-y-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Quick Tender Received:</span>
                <span className="font-mono font-bold text-white">₹{tenderAmount}</span>
              </div>
              <div className="flex gap-2">
                {[finalAmount, 200, 500].filter((v, i, a) => a.indexOf(v) === i && v >= finalAmount).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      triggerHaptic("tap");
                      setTenderAmount(v);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                      tenderAmount === v
                        ? "bg-emerald-500 text-slate-950 font-black border-emerald-400"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {v === finalAmount ? "Exact" : `₹${v}`}
                  </button>
                ))}
              </div>
              {changeDue > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-bold">Return Change:</span>
                  <span className="font-mono font-black text-amber-300 text-sm">₹{changeDue}</span>
                </div>
              )}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs text-slate-400 hover:text-white h-10 px-4 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-10 px-6 rounded-xl shadow-lg shadow-emerald-600/25"
            >
              {isLoading ? "Finalizing..." : "Confirm & Complete"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
