import React from "react";
import type { Salon, Ticket } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Sparkles, Check } from "lucide-react";

interface QueueAddServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: Salon | null;
  myTicket: Ticket | null;
  selectedAddOnIds: string[];
  setSelectedAddOnIds: React.Dispatch<React.SetStateAction<string[]>>;
  isUpdatingServices: boolean;
  onConfirm: () => void;
}

export function QueueAddServicesModal({
  isOpen,
  onClose,
  salon,
  myTicket,
  selectedAddOnIds,
  setSelectedAddOnIds,
  isUpdatingServices,
  onConfirm,
}: QueueAddServicesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <span>Add Services & Grooming</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            Customize your grooming session while you wait. Your barber will be prepared, and your queue wait time updates automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Current Base Service Card */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Primary Service</span>
            <span className="text-xs font-bold text-white">{myTicket?.serviceName}</span>
          </div>
          <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-400 font-bold">
            Base Service
          </Badge>
        </div>

        {/* Available Add-Ons List */}
        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
          <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Available Add-Ons</span>
          {(salon?.services || [])
            .filter((s) => s.id !== myTicket?.serviceId)
            .map((svc) => {
              const isSelected = selectedAddOnIds.includes(svc.id);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedAddOnIds((prev) => prev.filter((id) => id !== svc.id));
                    } else {
                      setSelectedAddOnIds((prev) => [...prev, svc.id]);
                    }
                  }}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all min-h-[48px] ${
                    isSelected
                      ? "bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/50"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected ? "bg-emerald-500 border-emerald-500 text-slate-950" : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-white">{svc.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        +{svc.estimatedDurationMinutes || 15} mins duration
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    +{formatCurrency(svc.basePrice)}
                  </span>
                </button>
              );
            })}
        </div>

        {/* Dynamic Price & Time Summary Preview */}
        {(() => {
          const baseService = salon?.services?.find((s) => s.id === myTicket?.serviceId);
          const basePrice = baseService?.basePrice || myTicket?.totalPrice || 100;
          const baseDuration = baseService?.estimatedDurationMinutes || myTicket?.totalDurationMinutes || 20;
          const addOns = (salon?.services || []).filter((s) => selectedAddOnIds.includes(s.id));
          const addOnsPrice = addOns.reduce((sum, a) => sum + a.basePrice, 0);
          const addOnsDuration = addOns.reduce((sum, a) => sum + (a.estimatedDurationMinutes || 0), 0);
          const previewTotal = basePrice + addOnsPrice;
          const previewDuration = baseDuration + addOnsDuration;

          return (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Updated Total Duration:</span>
                <span className="font-bold text-slate-200">~{previewDuration} mins</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-slate-800">
                <span className="text-white">Updated Total Bill:</span>
                <span className="text-emerald-400 font-mono text-base">{formatCurrency(previewTotal)}</span>
              </div>
            </div>
          );
        })()}

        <DialogFooter className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={isUpdatingServices}
            className="flex-1 min-h-[44px] rounded-xl border-slate-700 text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isUpdatingServices}
            className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
          >
            {isUpdatingServices ? "Saving..." : "Confirm & Update"}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
