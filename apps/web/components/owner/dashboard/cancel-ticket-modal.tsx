import React, { useState } from "react";
import { api, Ticket } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, X } from "lucide-react";

interface CancelTicketModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onSuccess: (ticketNumber: number) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function CancelTicketModal({
  ticket,
  onClose,
  onSuccess,
  showToast,
}: CancelTicketModalProps) {
  const [cancelling, setCancelling] = useState(false);

  if (!ticket) return null;

  const handleConfirm = async () => {
    setCancelling(true);
    try {
      await api.queue.cancel(ticket.id, "Removed by front desk");
      showToast(`Ticket #${ticket.ticketNumber} cancelled.`, "info");
      onSuccess(ticket.ticketNumber);
      onClose();
    } catch (err: any) {
      showToast("Failed to cancel ticket: " + (err.message || "Unknown error"), "error");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={Boolean(ticket)} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div>
        <DialogHeader>
          <DialogTitle className="text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            Cancel Queue Ticket #{ticket.ticketNumber}?
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel the ticket for{" "}
            <span className="text-white font-bold">{ticket.customerName}</span>? This will free their position and recalculate estimated wait times for everyone else in line.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={cancelling}
            className="min-h-[44px]"
          >
            Keep in Queue
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={cancelling}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold gap-2 min-h-[44px]"
          >
            {cancelling ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
