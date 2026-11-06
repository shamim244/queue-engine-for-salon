import React, { useState } from "react";
import { api } from "@/lib/api";
import type { Service, Stylist } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { UserPlus, RefreshCw } from "lucide-react";

interface CounterWalkinModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonSlug: string;
  services?: Service[];
  stylists?: Stylist[];
  onSuccess: (clientName: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function CounterWalkinModal({
  isOpen,
  onClose,
  salonSlug,
  services,
  stylists,
  onSuccess,
  showToast,
}: CounterWalkinModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Customer name is required", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.queue.quickAdd({
        salonSlug,
        customerName: name.trim(),
        customerPhone: phone.trim() || undefined,
        serviceId: serviceId || undefined,
      });

      onSuccess(name.trim());
      setName("");
      setPhone("");
      setServiceId("");
      setStylistId("");
      onClose();
    } catch (err: any) {
      showToast("Failed to add walk-in client: " + (err.message || "Unknown error"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Counter Walk-In Check-In</DialogTitle>
          <DialogDescription>
            Quickly enqueue a walk-in client arriving at the desk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Client Name *
            </label>
            <Input
              placeholder="e.g. Rahul Verma or Sharma Ji"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="min-h-[44px]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Mobile Phone (Optional for WhatsApp chair notification)
            </label>
            <Input
              placeholder="+91 98765 00000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Service Selection
              </label>
              <select
                className="flex min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">Default Haircut & Styling</option>
                {services?.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} ({formatCurrency(srv.basePrice)}) - {srv.estimatedDurationMinutes}m
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Assigned Stylist (Optional)
              </label>
              <select
                className="flex min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                value={stylistId}
                onChange={(e) => setStylistId(e.target.value)}
              >
                <option value="">Next Available Chair</option>
                {stylists?.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 min-h-[44px]"
          >
            {submitting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Issue Ticket & Enqueue
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
