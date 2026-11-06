import React, { useState, useEffect } from "react";
import { api, Ticket, Stylist } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Armchair, RefreshCw } from "lucide-react";

interface SeatClientModalProps {
  ticket: Ticket | null;
  stylists?: Stylist[];
  inServiceTickets: Ticket[];
  onClose: () => void;
  onSuccess: (ticketNumber: number) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function SeatClientModal({
  ticket,
  stylists,
  inServiceTickets,
  onClose,
  onSuccess,
  showToast,
}: SeatClientModalProps) {
  const [selectedStylistId, setSelectedStylistId] = useState<string>("");
  const [seating, setSeating] = useState(false);

  useEffect(() => {
    if (ticket) {
      const defaultStylist = stylists?.[0]?.id || "";
      setSelectedStylistId(ticket.stylistId || defaultStylist);
    }
  }, [ticket, stylists]);

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeating(true);
    try {
      await api.queue.seat(ticket.id, selectedStylistId || undefined);
      showToast(`Ticket #${ticket.ticketNumber} seated in chair!`, "success");
      onSuccess(ticket.ticketNumber);
      onClose();
    } catch (err: any) {
      showToast("Failed to seat client: " + (err.message || "Unknown error"), "error");
    } finally {
      setSeating(false);
    }
  };

  return (
    <Dialog open={Boolean(ticket)} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Seat Client in Chair</DialogTitle>
          <DialogDescription>
            Assign Ticket #{ticket.ticketNumber} ({ticket.customerName}) to a working station.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Select Working Chair / Stylist
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(stylists || []).map((st) => {
                const isSelected = selectedStylistId === st.id;
                const isOccupied = inServiceTickets.some((t) => t.stylistId === st.id);

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStylistId(st.id)}
                    className={`p-3 rounded-xl border text-left transition-all min-h-[52px] ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/15 text-white shadow-md shadow-blue-500/10"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-white">{st.name}</p>
                      <Badge
                        variant={isOccupied ? "secondary" : "success"}
                        className="text-[9px] py-0"
                      >
                        {isOccupied ? "Occupied" : "Free"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Avg: {st.historicalAvgDurationMinutes || 25} mins
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={seating}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={seating}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-2 min-h-[44px]"
          >
            {seating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Armchair className="h-4 w-4" />
            )}
            Confirm Seating
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
