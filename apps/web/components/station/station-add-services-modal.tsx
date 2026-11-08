import React, { useState, useEffect } from "react";
import type { Salon, Ticket } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Scissors, Sparkles, Check, Clock, AlertCircle } from "lucide-react";

interface StationAddServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: Salon | null;
  ticket: Ticket | null;
  isUpdating: boolean;
  onSave: (selectedAddOnIds: string[]) => void;
}

export function StationAddServicesModal({
  isOpen,
  onClose,
  salon,
  ticket,
  isUpdating,
  onSave,
}: StationAddServicesModalProps) {
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  // Initialize selected add-ons ONLY when modal opens
  useEffect(() => {
    if (isOpen && ticket) {
      let rawList: any[] = [];
      if (Array.isArray(ticket.selectedAddOns)) {
        rawList = ticket.selectedAddOns;
      } else if (typeof ticket.selectedAddOns === "string") {
        try {
          rawList = JSON.parse(ticket.selectedAddOns);
        } catch {
          rawList = [];
        }
      } else if (Array.isArray(ticket.addOnIds)) {
        rawList = ticket.addOnIds;
      }
      const existingIds = rawList
        .map((a: any) => (typeof a === "string" ? a : a?.id))
        .filter(Boolean);
      setSelectedAddOnIds(existingIds);
    }
  }, [isOpen]);

  if (!ticket) return null;

  // Base service info
  const baseService = salon?.services?.find((s) => s.id === ticket.serviceId) || {
    id: ticket.serviceId || "",
    name: ticket.serviceName || "Primary Service",
    basePrice: ticket.totalPrice || 150,
    estimatedDurationMinutes: (ticket as any).totalDurationMinutes || 20,
  };

  const basePrice = baseService.basePrice || 150;
  const baseDuration = baseService.estimatedDurationMinutes || 20;

  // Calculate add-on totals
  const allServices = salon?.services || [];
  const addOns = allServices.filter((s) => selectedAddOnIds.includes(s.id));
  const addOnsPrice = addOns.reduce((sum, a) => sum + a.basePrice, 0);
  const addOnsDuration = addOns.reduce((sum, a) => sum + (a.estimatedDurationMinutes || 15), 0);

  const totalCalculatedBill = basePrice + addOnsPrice;
  const totalCalculatedDuration = baseDuration + addOnsDuration;

  const handleToggleAddOn = (svcId: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(svcId) ? prev.filter((id) => id !== svcId) : [...prev, svcId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div className="space-y-5">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <span>Add / Modify Services</span>
                <Badge variant="outline" className="border-amber-500/40 text-amber-300 font-mono text-xs">
                  #{ticket.ticketNumber}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Client: <strong className="text-slate-200">{ticket.customerName}</strong> (In Chair)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Primary Service Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
              Base Service (Chair)
            </span>
            <span className="text-sm font-bold text-white mt-0.5 block">{baseService.name}</span>
            <span className="text-xs text-slate-400">{baseDuration} mins allotted</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-emerald-400">{formatCurrency(basePrice)}</span>
            <Badge variant="secondary" className="block text-[10px] mt-1">
              Primary
            </Badge>
          </div>
        </div>

        {/* Add-on Selection List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Available Grooming Add-Ons</span>
            </span>
            <span className="text-[11px] text-slate-500">Tap to toggle</span>
          </div>

          <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
            {allServices
              .filter((s) => s.id !== baseService.id)
              .map((svc) => {
                const isSelected = selectedAddOnIds.includes(svc.id);
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleAddOn(svc.id);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all min-h-[52px] select-none cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/30"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-500 text-slate-950"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="text-sm font-bold block text-white">{svc.name}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>+{svc.estimatedDurationMinutes || 15} mins duration</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      +{formatCurrency(svc.basePrice)}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Total Expected Chair Time:</span>
            <span className="text-white font-mono font-bold">~{totalCalculatedDuration} mins</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold border-t border-slate-800/80 pt-2">
            <span className="text-slate-300">Updated Ticket Bill:</span>
            <span className="text-emerald-400 text-base font-mono">{formatCurrency(totalCalculatedBill)}</span>
          </div>
          {addOnsDuration > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 pt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span>
                Lounge clients will automatically have their wait time adjusted by +{addOnsDuration}m.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUpdating}
            className="flex-1 min-h-[48px] rounded-xl border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSave(selectedAddOnIds)}
            disabled={isUpdating}
            className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm gap-2 shadow-lg shadow-emerald-950/50"
          >
            <Check className="h-4 w-4" />
            <span>
              {isUpdating ? "Saving..." : `Save Services (${formatCurrency(totalCalculatedBill)})`}
            </span>
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
