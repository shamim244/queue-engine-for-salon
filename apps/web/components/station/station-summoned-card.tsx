import React from "react";
import type { Ticket } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, maskPhone } from "@/lib/utils";
import { Volume2, UserCheck, Clock, Coffee, UserX, HeartHandshake, ShieldCheck } from "lucide-react";

interface StationSummonedCardProps {
  summonedTicket: Ticket;
  processingAction: boolean;
  onSeatInChair: () => void;
  onPauseAndCallNext: () => void;
  onHoldAndCallNext: () => void;
  onNoShow: () => void;
  onReAnnounce: () => void;
}

export function StationSummonedCard({
  summonedTicket,
  processingAction,
  onSeatInChair,
  onPauseAndCallNext,
  onHoldAndCallNext,
  onNoShow,
  onReAnnounce,
}: StationSummonedCardProps) {
  const visitCount = summonedTicket.visitCount || 1;
  const isReturning = visitCount > 1;

  return (
    <Card className="border-2 border-amber-500 bg-amber-500/5 p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
      <div className="flex items-center justify-between pb-4 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-400 animate-ping" />
          <Badge variant="warning" className="text-xs px-3 py-1 font-bold">
            CLIENT CALLED · SUMMONED TO CHAIR
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReAnnounce}
          className="text-xs text-amber-400 gap-1 hover:bg-amber-500/10"
        >
          <Volume2 className="h-4 w-4" />
          Re-Announce
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-3xl bg-amber-500 text-slate-950 font-black text-3xl flex items-center justify-center shadow-xl shadow-amber-500/20">
            #{summonedTicket.ticketNumber}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-black text-white">{summonedTicket.customerName}</h3>
              {isReturning ? (
                <Badge className="text-xs px-2.5 py-0.5 font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <HeartHandshake className="h-3 w-3 text-amber-400" />
                  <span>⭐ {visitCount === 2 ? "2nd Visit" : `${visitCount}th Visit`} · Regular VIP</span>
                </Badge>
              ) : (
                <Badge className="text-xs px-2.5 py-0.5 font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  🆕 First-Time Guest
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1 flex-wrap">
              <span>{maskPhone(summonedTicket.customerPhone) || "Walk-in Guest"}</span>
              {summonedTicket.lastServiceName && (
                <span className="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-900/60 px-2 py-0.5 rounded-lg">
                  Last visit: {summonedTicket.lastServiceName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400">Expected Bill</span>
          <p className="text-2xl font-black text-emerald-400">
            {formatCurrency(summonedTicket.totalPrice || 150)}
          </p>
        </div>
      </div>

      {/* Feature 2: Client Known Grooming Preferences Preview */}
      {((summonedTicket.groomingTags && summonedTicket.groomingTags.length > 0) || summonedTicket.notes) && (
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span>Client Preferences on File:</span>
          </div>
          {summonedTicket.groomingTags && summonedTicket.groomingTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {summonedTicket.groomingTags.map((tag, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs bg-sky-500/15 border-sky-400/40 text-sky-200 font-semibold"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {summonedTicket.notes && (
            <p className="text-xs text-slate-300 italic pl-1 border-l-2 border-amber-400/50">
              &ldquo;{summonedTicket.notes}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Action Buttons: In Chair vs Multi-Perspective Absence Handling */}
      <div className="space-y-3 pt-2">
        <Button
          size="lg"
          onClick={onSeatInChair}
          disabled={processingAction}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg h-14 rounded-xl gap-2 shadow-lg shadow-emerald-600/20 active:scale-98"
        >
          <UserCheck className="h-6 w-6" />
          <span>In Chair (Customer Arrived)</span>
        </Button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={onPauseAndCallNext}
            disabled={processingAction}
            className="border-2 border-sky-400/80 bg-sky-950/80 text-sky-100 hover:bg-sky-900 hover:border-sky-300 font-bold h-12 rounded-xl gap-2 text-xs flex items-center justify-center shadow-md shadow-sky-950/40 transition-all select-none"
            title="Holds ticket on pause while customer runs errand, and calls next client"
          >
            <Coffee className="h-4 w-4 text-sky-300 shrink-0" />
            <span className="tracking-wide">Pause Spot</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onHoldAndCallNext}
            disabled={processingAction}
            className="border-2 border-amber-400/80 bg-amber-950/80 text-amber-100 hover:bg-amber-900 hover:border-amber-300 font-bold h-12 rounded-xl gap-2 text-xs flex items-center justify-center shadow-md shadow-amber-950/40 transition-all select-none"
            title="3-minute grace period hold and calls next client"
          >
            <Clock className="h-4 w-4 text-amber-300 shrink-0" />
            <span className="tracking-wide">Grace Hold</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onNoShow}
            disabled={processingAction}
            className="border-2 border-rose-400/80 bg-rose-950/80 text-rose-100 hover:bg-rose-900 hover:border-rose-300 font-bold h-12 rounded-xl gap-2 text-xs flex items-center justify-center shadow-md shadow-rose-950/40 transition-all select-none"
            title="Mark customer as no-show and remove from active queue"
          >
            <UserX className="h-4 w-4 text-rose-300 shrink-0" />
            <span className="tracking-wide">No-Show</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
