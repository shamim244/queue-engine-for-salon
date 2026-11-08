import React from "react";
import type { Salon } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QueueLoadMetrics } from "./queue-helpers";
import { Shuffle, Zap, Scissors } from "lucide-react";

interface QueuePreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: Salon | null;
  newPreferenceStylistId: string | null;
  setNewPreferenceStylistId: (id: string | null) => void;
  queueLoadMetrics: QueueLoadMetrics;
  isSwitchingPref: boolean;
  onConfirm: () => void;
}

export function QueuePreferenceModal({
  isOpen,
  onClose,
  salon,
  newPreferenceStylistId,
  setNewPreferenceStylistId,
  queueLoadMetrics,
  isSwitchingPref,
  onConfirm,
}: QueuePreferenceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-amber-400" />
            <span>Change Barber Preference</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            Switch to a specific barber or back to the fastest chair anytime. Your original arrival time is preserved so you keep your fair place in line!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {/* Option A: Fastest Available */}
          <button
            type="button"
            onClick={() => setNewPreferenceStylistId(null)}
            className={`w-full p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
              newPreferenceStylistId === null
                ? "bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md"
                : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold">Fastest Available Chair (Auto-Assign)</span>
              </div>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 font-bold">
                ~{queueLoadMetrics.automated.estWaitMin}m Wait
              </Badge>
            </div>
            <span className="text-[11px] text-slate-400 mt-1.5">
              Automatically places you into whichever of the {queueLoadMetrics.activeChairs} chairs opens first.
            </span>
          </button>

          {/* Option B: Specific Stylists */}
          {salon?.stylists?.map((st) => {
            const metric = queueLoadMetrics.byStylist[st.id] || {
              waitingCount: 0,
              estWaitMin: 20,
              isFreeNow: true,
              dedicatedCount: 0,
              universalShare: 0,
            };
            const isSelected = newPreferenceStylistId === st.id;

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setNewPreferenceStylistId(st.id)}
                className={`w-full p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected
                    ? "bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 truncate">
                    <Scissors className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-xs font-bold truncate">{st.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 shrink-0 ml-1">
                    ~{metric.estWaitMin}m
                  </span>
                </div>
                <div className="flex items-center justify-between w-full text-[11px] text-slate-400 mt-1.5">
                  <span>{metric.waitingCount} clients ahead for {st.name.split(" ")[0]}</span>
                  {metric.isFreeNow && <span className="text-emerald-400 font-semibold">Chair Ready</span>}
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={isSwitchingPref}
            className="flex-1 min-h-[44px] rounded-xl border-slate-700 text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSwitchingPref}
            className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
          >
            {isSwitchingPref ? "Updating..." : "Update Preference"}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
