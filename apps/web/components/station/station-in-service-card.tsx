import React from "react";
import type { Ticket } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveServiceTimer } from "@/components/live-service-timer";
import { formatCurrency, maskPhone } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface StationInServiceCardProps {
  currentlyServing: Ticket;
  editableBill: number;
  processingAction: boolean;
  onProceedToCheckout: () => void;
}

export function StationInServiceCard({
  currentlyServing,
  editableBill,
  processingAction,
  onProceedToCheckout,
}: StationInServiceCardProps) {
  const startedTime =
    (currentlyServing as any).startedTime ||
    (currentlyServing as any).seatedAt ||
    currentlyServing.createdAt;
  const estimatedDuration =
    (currentlyServing as any).totalDurationMinutes ||
    (currentlyServing as any).estimatedDurationMinutes ||
    20;

  return (
    <Card className="border-2 border-emerald-500/80 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 p-6 sm:p-8 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-emerald-500/30">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
          <Badge variant="success" className="text-xs px-3 py-1 font-bold">
            CURRENTLY IN CHAIR
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-950/60 border border-slate-800 px-3 py-1 rounded-xl">
          <span className="text-slate-500">Allotted:</span>
          <span className="font-bold text-white">~{estimatedDuration} mins</span>
        </div>
      </div>

      {/* Client RAM Live Service Progress Bar & Overtime Monitor */}
      <LiveServiceTimer
        startedTime={startedTime}
        estimatedDurationMinutes={estimatedDuration}
        variant="station"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-3xl bg-emerald-500 text-slate-950 font-black text-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
            #{currentlyServing.ticketNumber}
          </div>
          <div>
            <h3 className="text-3xl font-black text-white">{currentlyServing.customerName}</h3>
            <p className="text-sm text-slate-400 mt-1">
              {maskPhone(currentlyServing.customerPhone) || "Walk-in Guest"}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-right min-w-[200px]">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
            Selected Service
          </span>
          <p className="text-base font-bold text-white">
            {currentlyServing.serviceName || "Haircut Service"}
          </p>
          <p className="text-xs font-semibold text-emerald-400 mt-1">
            {formatCurrency(currentlyServing.totalPrice || editableBill || 150)}
          </p>
        </div>
      </div>

      {/* Complete Service -> Proceed to Payment Button */}
      <div className="pt-4 border-t border-slate-800">
        <Button
          size="xl"
          onClick={onProceedToCheckout}
          disabled={processingAction}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl h-16 rounded-2xl gap-3 shadow-xl shadow-emerald-600/20 transition-all active:scale-98"
        >
          <CheckCircle2 className="h-7 w-7" />
          <span>✅ Complete Service &rarr; Proceed to Payment</span>
        </Button>
      </div>
    </Card>
  );
}
