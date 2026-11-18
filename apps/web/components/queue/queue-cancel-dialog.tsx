import React from "react";
import type { Ticket } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldAlert } from "lucide-react";

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
  const isInChair = myTicket?.status === "IN_CHAIR" || myTicket?.status === "IN_SERVICE";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            {isInChair ? (
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400" />
            )}
            <span>{isInChair ? "Service Underway in Chair" : "Cancel Queue Ticket?"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            {isInChair ? (
              <span className="text-amber-200/90 leading-relaxed block">
                Your grooming service is actively in progress in the chair. In-progress services cannot be cancelled from the pocket tracker. Please speak directly with your barber or front desk to settle checkout.
              </span>
            ) : (
              `Are you sure you want to cancel ticket #${myTicket?.ticketNumber}? Your place in line will be surrendered.`
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex items-center gap-2 pt-2">
          {isInChair ? (
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full min-h-[44px] rounded-xl border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              Understood, Return to Tracker
            </Button>
          ) : (
            <>
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
            </>
          )}
        </DialogFooter>
      </div>
    </Dialog>
  );
}
