import React from "react";
import type { Service } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

interface StationQuickWalkinModalProps {
  isOpen: boolean;
  services?: Service[];
  quickAddName: string;
  quickAddPhone: string;
  quickAddServiceId: string;
  addingWalkin: boolean;
  onClose: () => void;
  onNameChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onServiceChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StationQuickWalkinModal({
  isOpen,
  services,
  quickAddName,
  quickAddPhone,
  quickAddServiceId,
  addingWalkin,
  onClose,
  onNameChange,
  onPhoneChange,
  onServiceChange,
  onSubmit,
}: StationQuickWalkinModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogClose onClose={onClose} />
      <DialogHeader>
        <DialogTitle>1-Tap Quick Add Walk-in</DialogTitle>
        <DialogDescription>
          Add an in-person client directly to the queue without phone QR scan.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4 my-4">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            Client Name *
          </label>
          <Input
            placeholder="e.g. Walk-in Client or Uncle Ji"
            value={quickAddName}
            onChange={(e) => onNameChange(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            Phone Number (Optional)
          </label>
          <Input
            placeholder="e.g. 9876543210 (Leave blank if none)"
            value={quickAddPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            Service
          </label>
          <select
            className="flex h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            value={quickAddServiceId}
            onChange={(e) => onServiceChange(e.target.value)}
          >
            {services?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({formatCurrency(s.basePrice)})
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={addingWalkin}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
          >
            {addingWalkin ? "Adding to Queue..." : "🎟️ Add to Queue"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
