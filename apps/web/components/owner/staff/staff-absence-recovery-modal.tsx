"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { AuthUser, Stylist, Ticket } from "@/lib/api";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface StaffAbsenceRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  stylist: Stylist | null;
  salonId?: string;
  allStylists: Stylist[];
  onSuccess: (msg: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function StaffAbsenceRecoveryModal({
  isOpen,
  onClose,
  user,
  stylist,
  salonId,
  allStylists,
  onSuccess,
  showToast,
}: StaffAbsenceRecoveryModalProps) {
  const [loading, setLoading] = useState(false);
  const [checkingTickets, setCheckingTickets] = useState(false);
  const [strandedTickets, setStrandedTickets] = useState<Ticket[]>([]);
  const [action, setAction] = useState<"UNIVERSAL_FAST_LINE" | "REASSIGN_STYLIST">("UNIVERSAL_FAST_LINE");
  const [targetStylistId, setTargetStylistId] = useState("");
  const [leaveDate, setLeaveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");

  const stylistId = stylist?.id || user?.staffId;
  const staffName = user?.fullName || stylist?.name || user?.username || "Staff Member";

  // Available alternative stylists for reassignment (exclude absent stylist)
  const availableStylists = allStylists.filter(
    (s) => s.id !== stylistId && s.isActive !== false
  );

  useEffect(() => {
    if (isOpen && salonId && stylistId) {
      setLeaveDate(new Date().toISOString().slice(0, 10));
      setReason("");
      setAction("UNIVERSAL_FAST_LINE");
      setTargetStylistId(availableStylists[0]?.id || "");

      // Check stranded queue tickets
      setCheckingTickets(true);
      api.salons
        .getStylistStrandedTickets(salonId, stylistId)
        .then((res) => {
          setStrandedTickets(res.tickets || []);
        })
        .catch((err) => {
          console.warn("Failed to check stranded tickets:", err);
          setStrandedTickets([]);
        })
        .finally(() => {
          setCheckingTickets(false);
        });
    }
  }, [isOpen, salonId, stylistId]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId || !stylistId) {
      showToast("Salon ID or Stylist ID missing", "error");
      return;
    }

    if (action === "REASSIGN_STYLIST" && !targetStylistId) {
      showToast("Please choose a target barber chair for queue reassignment", "error");
      return;
    }

    setLoading(true);
    try {
      if (strandedTickets.length > 0) {
        // Late-detected absence with stranded customer queue
        const res = await api.salons.handleStaffAbsence(salonId, {
          stylistId,
          action,
          targetStylistId: action === "REASSIGN_STYLIST" ? targetStylistId : undefined,
          reason: reason.trim() || "Absence recovered via Owner Panel",
        });

        showToast(
          res.message || `Recovered ${res.affectedCount} stranded tickets seamlessly!`,
          "success"
        );
        onSuccess(res.message);
      } else {
        // Normal / Planned leave creation
        await api.salons.createStaffLeave(salonId, {
          stylistId,
          leaveDate,
          reason: reason.trim() || "Staff leave marked by owner",
          status: "APPROVED",
          appliedBy: "OWNER",
        });

        showToast(`Marked ${staffName} on leave for ${leaveDate}!`, "success");
        onSuccess(`Marked ${staffName} on leave`);
      }
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to process absence recovery", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  Staff Absence & Leave
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Manage planned leave or recover stranded customers for {staffName}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleConfirm} className="space-y-5">
            {/* Stranded Tickets Alert Banner */}
            {checkingTickets ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-slate-400 text-sm">
                <Clock className="h-4 w-4 animate-spin text-amber-400" />
                Checking waiting customers for {staffName}...
              </div>
            ) : strandedTickets.length > 0 ? (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/40 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">
                      Late-Detected Absence Warning
                    </h4>
                    <p className="text-xs text-amber-200/90 mt-0.5">
                      <strong className="text-white">{strandedTickets.length} customer(s)</strong> are
                      currently waiting in line specifically for {staffName}!
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-amber-500/20 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span>Stranded Tickets:</span>
                    <span className="font-mono text-amber-400">
                      {strandedTickets.map((t) => `#${t.ticketNumber}`).join(", ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Arrival timestamps and seniority are strictly preserved. Choose how you want the queue engine to route these customers:
                  </p>
                </div>

                {/* Queue Recovery Action Radio Selector */}
                <div className="space-y-2 pt-1">
                  <label
                    onClick={() => setAction("UNIVERSAL_FAST_LINE")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      action === "UNIVERSAL_FAST_LINE"
                        ? "bg-amber-500/10 border-amber-500/60 shadow-inner"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="recoveryAction"
                      checked={action === "UNIVERSAL_FAST_LINE"}
                      onChange={() => setAction("UNIVERSAL_FAST_LINE")}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Universal Fast Line (Next Available Barber)
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        >
                          Recommended
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Moves tickets to the fastest chair line. The next available barber immediately calls them without losing their spot.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setAction("REASSIGN_STYLIST")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      action === "REASSIGN_STYLIST"
                        ? "bg-amber-500/10 border-amber-500/60 shadow-inner"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="recoveryAction"
                      checked={action === "REASSIGN_STYLIST"}
                      onChange={() => setAction("REASSIGN_STYLIST")}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="space-y-0.5 w-full">
                      <span className="text-xs font-bold text-white">
                        Reassign to a Specific Active Colleague
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Transfers all stranded tickets directly to another working barber's chair queue.
                      </p>

                      {action === "REASSIGN_STYLIST" && (
                        <div className="pt-2">
                          <select
                            value={targetStylistId}
                            onChange={(e) => setTargetStylistId(e.target.value)}
                            className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 text-white p-2.5 min-h-[44px]"
                          >
                            {availableStylists.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} ({st.avgDurationMinutes || 25} min pace)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* WhatsApp Dispatch Preview */}
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-600/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Automatic Reassurance Alert:
                  </div>
                  <p className="text-[11px] text-emerald-200/80 italic">
                    "💈 Update on your Ticket: Your preferred stylist is unavailable today. You have been seamlessly moved to the Fastest Available Line with your arrival priority fully preserved!"
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-slate-300 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>No customers are currently stranded in {staffName}'s queue. Safe to record leave.</span>
              </div>
            )}

            {/* Leave Details Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Leave Date:
                </label>
                <Input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-sm min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Absence / Leave Reason (Optional):
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Sudden illness, family function, emergency"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-sm min-h-[44px]"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px] border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {strandedTickets.length > 0 ? "Execute 1-Tap Recovery" : "Confirm Leave"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
