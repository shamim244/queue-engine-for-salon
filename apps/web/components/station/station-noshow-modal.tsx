import React from "react";
import type { Ticket } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { maskPhone } from "@/lib/utils";
import { UserX, AlertTriangle, Coffee } from "lucide-react";

interface StationNoShowModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  processingAction: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function StationNoShowModal({
  isOpen,
  ticket,
  processingAction,
  onClose,
  onConfirm,
}: StationNoShowModalProps) {
  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div className="space-y-5">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                Confirm No-Show Removal
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Prevent accidental client drops from the queue
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Ticket Details Box */}
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-11 w-11 rounded-xl bg-rose-500/20 text-rose-300 font-black text-lg flex items-center justify-center border border-rose-500/30">
                {`#${ticket.ticketNumber}`}
              </span>
              <div>
                <p className="font-bold text-white text-base">{ticket.customerName}</p>
                <p className="text-xs text-slate-400">
                  {ticket.customerPhone ? maskPhone(ticket.customerPhone) : "Walk-in Guest"}
                </p>
              </div>
            </div>
            <Badge variant="destructive" className="text-xs px-2.5 py-1 font-bold">
              Mark No-Show
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/20 flex items-start gap-2 text-rose-200 text-xs">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              This will <strong>permanently remove</strong> this customer from the live queue and automatically summon the next waiting client to the chair.
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
            <Coffee className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span>
              Tip: If they just stepped out momentarily, use <strong>Pause Spot</strong> or <strong>Grace Hold</strong> instead.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={processingAction}
            className="flex-1 min-h-[48px] rounded-xl border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm"
          >
            Keep in Queue
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={processingAction}
            className="flex-1 min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm gap-2 shadow-lg shadow-rose-950/50"
          >
            <UserX className="h-4 w-4" />
            <span>{processingAction ? "Removing..." : "Yes, Mark No-Show"}</span>
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
