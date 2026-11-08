import React from "react";
import type { Ticket, Stylist } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Volume2, Armchair, Coffee, Sparkles, User, Clock, ArrowRight } from "lucide-react";

interface StationOpenChairCardProps {
  eligibleTicketsCount: number;
  processingAction: boolean;
  nextEligibleTicket?: Ticket | null;
  activeStylist?: Stylist | null;
  isOnBreak?: boolean;
  breakRemainingSeconds?: number | null;
  onCallNext: () => void;
  onDirectSeat?: (ticket: Ticket) => void;
  onResumeBreak?: () => void;
  onStartBreak?: () => void;
  onOpenQuickAdd?: () => void;
}

export function StationOpenChairCard({
  eligibleTicketsCount,
  processingAction,
  nextEligibleTicket,
  activeStylist,
  isOnBreak,
  breakRemainingSeconds,
  onCallNext,
  onDirectSeat,
  onResumeBreak,
  onStartBreak,
  onOpenQuickAdd,
}: StationOpenChairCardProps) {
  // Mode A: 10-Minute Chai Break Active
  if (isOnBreak) {
    const mins = Math.floor((breakRemainingSeconds || 0) / 60);
    const secs = (breakRemainingSeconds || 0) % 60;
    const timeFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

    return (
      <Card className="border-2 border-amber-500/60 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 p-8 text-center space-y-6 shadow-2xl animate-in fade-in">
        <div className="space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
            <Coffee className="h-8 w-8 animate-pulse" />
          </div>
          <Badge variant="warning" className="px-3 py-1 text-xs">
            ☕ CHAIR ON 10-MINUTE CHAI BREAK
          </Badge>
          <div className="font-mono text-5xl font-black text-amber-300 tracking-tight">
            {timeFormatted}
          </div>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Take a breather, sterilize clippers, or enjoy tea. Waiting customers and lounge display are cushioned with a 10-minute buffer.
          </p>
        </div>

        <Button
          size="xl"
          onClick={onResumeBreak}
          className="w-full max-w-sm h-14 text-base font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-xl rounded-2xl gap-2.5 mx-auto transition-all active:scale-95"
        >
          <Armchair className="h-5 w-5" />
          <span>✅ Back from Break · Open Chair</span>
        </Button>
      </Card>
    );
  }

  // Mode B: Active Open Chair
  return (
    <Card className="border-2 border-dashed border-amber-500/50 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-6 sm:p-8 text-center space-y-6 shadow-2xl">
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="warning" className="px-3 py-1 text-xs">
            CHAIR IS READY
          </Badge>
          {activeStylist && (
            <Badge variant="outline" className="text-xs border-slate-700 bg-slate-800 text-slate-300">
              {activeStylist.name}
            </Badge>
          )}
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white">
          Chair is Open &amp; Available
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {eligibleTicketsCount > 0
            ? `${eligibleTicketsCount} eligible client${eligibleTicketsCount > 1 ? "s" : ""} waiting in queue.`
            : "No clients currently waiting for your chair. Walk-ins can scan Door QR to enter queue."}
        </p>
      </div>

      {/* Feature 3: Next-Up Client Preview Card */}
      {nextEligibleTicket && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 text-left space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Next Client Up (Preview)</span>
            </span>
            <Badge variant="outline" className="text-[10px] bg-slate-900 border-slate-700 text-slate-300 font-semibold">
              {nextEligibleTicket.stylistId ? `⭐ Requested ${activeStylist?.name || "This Chair"}` : "⚡ Universal Fast Line"}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-lg flex items-center justify-center shrink-0">
                #{nextEligibleTicket.ticketNumber}
              </div>
              <div>
                <h4 className="text-base font-bold text-white leading-tight">
                  {nextEligibleTicket.customerName}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Service: <span className="text-slate-200 font-semibold">{nextEligibleTicket.serviceName || "Haircut"}</span>
                </p>
              </div>
            </div>

            {onDirectSeat && (
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => onDirectSeat(nextEligibleTicket)}
                disabled={processingAction}
                className="border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold gap-1.5 h-10 px-3.5 rounded-xl shrink-0 transition-all self-end sm:self-auto"
                title="If client is already seated, skip call announcement and seat immediately"
              >
                <Armchair className="h-4 w-4" />
                <span>Seat Directly</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Primary Action: 1-Tap Call Next */}
      <div className="space-y-3">
        <Button
          size="xl"
          onClick={onCallNext}
          disabled={processingAction || eligibleTicketsCount === 0}
          className="w-full max-w-md h-18 text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-2xl shadow-amber-500/30 rounded-2xl gap-3 mx-auto transition-all active:scale-95"
        >
          <Volume2 className="h-7 w-7" />
          <span>
            {nextEligibleTicket
              ? `📢 CALL NEXT (#${nextEligibleTicket.ticketNumber} · ${nextEligibleTicket.customerName})`
              : "📢 CALL NEXT CLIENT"}
          </span>
        </Button>

        {/* Quick Break & Walk-in Shortcuts */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {onStartBreak && (
            <button
              type="button"
              onClick={onStartBreak}
              disabled={processingAction}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 transition-all"
            >
              <Coffee className="h-3.5 w-3.5 text-amber-400" />
              <span>Take 10m Chai Break</span>
            </button>
          )}
          {onOpenQuickAdd && (
            <button
              type="button"
              onClick={onOpenQuickAdd}
              disabled={processingAction}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>+ Quick Add Walk-in</span>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
