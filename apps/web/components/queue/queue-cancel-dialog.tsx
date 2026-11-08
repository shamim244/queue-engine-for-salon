import React from "react";
import type { Ticket } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface QueueCancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  myTicket: Ticket | null;
  cancelling: boolean;
  onConfirm: () => void;
}

export function QueueCancelDialog({
  isOpen,
  onClose,
  myTicket,
  cancelling,
  onConfirm,
}: QueueCancelDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            <span>Cancel Queue Ticket?</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            Are you sure you want to cancel ticket #{myTicket?.ticketNumber}? Your place in line will be surrendered.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 min-h-[44px] rounded-xl border-slate-700 text-slate-300"
          >
            Keep My Spot
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={cancelling}
            className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {cancelling ? "Cancelling..." : "Yes, Cancel"}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
