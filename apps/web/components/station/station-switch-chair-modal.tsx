import React from "react";
import type { Stylist } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface StationSwitchChairModalProps {
  isOpen: boolean;
  stylists: Stylist[];
  activeStylistId?: string;
  onClose: () => void;
  onSelectStylist: (stylist: Stylist) => void;
}

export function StationSwitchChairModal({
  isOpen,
  stylists,
  activeStylistId,
  onClose,
  onSelectStylist,
}: StationSwitchChairModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogClose onClose={onClose} />
      <DialogHeader>
        <DialogTitle>Select Stylist Chair</DialogTitle>
        <DialogDescription>Swap active chair on this shared mirror tablet.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2 my-4">
        {stylists.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => onSelectStylist(st)}
            className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-colors ${
              activeStylistId === st.id
                ? "border-amber-500 bg-amber-500/10 text-amber-300 font-bold"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <div>
              <p className="font-bold text-base text-white">{st.name}</p>
              <p className="text-xs text-slate-400">Pace: {st.avgDurationMinutes || 25}m</p>
            </div>
            <Badge variant={st.isAvailable ? "success" : "secondary"}>
              {st.isAvailable ? "Available" : "In Chair"}
            </Badge>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
