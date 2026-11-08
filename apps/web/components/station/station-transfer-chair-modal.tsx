"use client";

import React, { useState } from "react";
import type { Ticket, Stylist } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { triggerHaptic } from "@/lib/haptics";
import { ArrowRightLeft, User, Scissors, Check, AlertCircle } from "lucide-react";

interface StationTransferChairModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  stylists: Stylist[];
  currentStylistId?: string;
  onConfirmTransfer: (targetStylistId: string, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

const COMMON_REASONS = [
  "Specialized Service (Hair Dye / Facial / Chemical)",
  "Barber Shift Handover / Chai Break",
  "Customer Requested Specific Barber",
  "Chair / Station Mirror Adjustment",
];

export function StationTransferChairModal({
  isOpen,
  onClose,
  ticket,
  stylists,
  currentStylistId,
  onConfirmTransfer,
  isLoading = false,
}: StationTransferChairModalProps) {
  const [selectedStylistId, setSelectedStylistId] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !ticket) return null;

  // Filter out current stylist
  const availableTargetStylists = stylists.filter(
    (st) => st.id !== currentStylistId && st.id !== ticket.stylistId
  );

  const handleSelectStylist = (id: string) => {
    triggerHaptic("tap");
    setSelectedStylistId(id);
    setError(null);
  };

  const handleSelectReason = (reason: string) => {
    triggerHaptic("tap");
    setSelectedReason(reason);
  };

  const handleConfirm = async () => {
    if (!selectedStylistId) {
      setError("कृपया ट्रांसफर के लिए नया बार्बर / चेयर चुनें");
      triggerHaptic("alert");
      return;
    }

    const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
    triggerHaptic("transfer");

    try {
      await onConfirmTransfer(selectedStylistId, finalReason);
      setSelectedStylistId("");
      setCustomReason("");
      setError(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || "चेयर ट्रांसफर विफल रहा");
      triggerHaptic("alert");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogClose onClose={onClose} />
      <DialogHeader>
        <div className="flex items-center gap-2 text-amber-400">
          <ArrowRightLeft className="h-5 w-5" />
          <DialogTitle className="text-lg font-black text-white">
            1-Tap Chair Handover (चेयर ट्रांसफर)
          </DialogTitle>
        </div>
        <DialogDescription className="text-slate-400 text-xs">
          ग्राहक को बिना टिकट रद्द किए तुरंत दूसरे बार्बर की चेयर पर भेजें।
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 my-3">
        {/* Ticket Preview Card */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono font-black text-lg flex items-center justify-center shrink-0">
              #{ticket.ticketNumber}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{ticket.customerName}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="truncate">{ticket.serviceName}</span>
                <span>•</span>
                <span className="font-bold text-amber-400 font-mono">₹{ticket.totalPrice}</span>
              </div>
            </div>
          </div>
          <Badge
            className={`text-[10px] px-2 py-0.5 font-bold uppercase shrink-0 ${
              ticket.status === "IN_CHAIR" || ticket.status === "IN_SERVICE"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-blue-500/20 text-blue-300 border-blue-500/40"
            }`}
          >
            {ticket.status}
          </Badge>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Select Target Barber Chair */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Target Barber / Chair चुनें (Select Chair)</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {availableTargetStylists.length} Barbers Available
            </span>
          </label>

          {availableTargetStylists.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
              No other active barbers in this salon to transfer to.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {availableTargetStylists.map((st) => {
                const isSelected = selectedStylistId === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectStylist(st.id)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all min-h-[50px] active:scale-98 ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/15 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/30"
                        : "border-slate-800 bg-slate-900/90 hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                          isSelected
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isSelected ? "text-amber-300" : "text-white"}`}>
                          {st.name}
                        </p>
                        <p className="text-[10px] text-slate-400">Pace: ~{st.avgDurationMinutes || 25}m</p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="h-5 w-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          Chair
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reason for Handover */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">
            हैंडओवर का कारण (Reason for Handover)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {COMMON_REASONS.map((reason) => {
              const isReasonSelected = selectedReason === reason && !customReason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    handleSelectReason(reason);
                    setCustomReason("");
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-colors min-h-[44px] ${
                    isReasonSelected
                      ? "border-amber-500/80 bg-amber-500/10 text-amber-300 font-semibold"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {reason}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="या कोई अन्य कारण लिखें (Other specific note)..."
            className="w-full mt-1.5 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Action Buttons (Android Thumb Friendly: min 48px height) */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white h-12 px-4 rounded-xl text-xs"
          >
            Cancel (रद्द करें)
          </Button>

          <Button
            type="button"
            variant="default"
            disabled={!selectedStylistId || isLoading}
            onClick={handleConfirm}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-12 px-6 rounded-xl shadow-lg shadow-amber-500/20 gap-2 active:scale-98"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>{isLoading ? "Transferring..." : "Confirm Chair Transfer (ट्रांसफर करें)"}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
