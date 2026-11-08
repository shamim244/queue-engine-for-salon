import React, { useState } from "react";
import type { Ticket, Stylist } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, User, Shuffle, Lock, Coffee, RotateCcw, ArrowRightLeft } from "lucide-react";

interface StationWaitingQueueProps {
  allTickets: Ticket[];
  activeStylist: Stylist | null;
  processingAction: boolean;
  hasCurrentlyServing: boolean;
  onSummonSpecific: (ticket: Ticket) => void;
  onPauseTicket?: (ticket: Ticket) => void;
  onResumeTicket?: (ticket: Ticket) => void;
  onTransferTicket?: (ticket: Ticket) => void;
}

export function StationWaitingQueue({
  allTickets,
  activeStylist,
  processingAction,
  hasCurrentlyServing,
  onSummonSpecific,
  onPauseTicket,
  onResumeTicket,
  onTransferTicket,
}: StationWaitingQueueProps) {
  const [activeTab, setActiveTab] = useState<"YOURS" | "OTHER" | "PAUSED">("YOURS");

  const waitingTickets = allTickets.filter(
    (t) => t.status === "WAITING" || t.status === "SOFT_BUMPED"
  );

  const pausedTickets = allTickets.filter((t) => t.status === "PAUSED");

  // Chronological arrival sort helper (FIFO)
  const sortByArrival = (a: Ticket, b: Ticket) => {
    const timeA = new Date(a.checkInTime || (a as any).createdAt || 0).getTime();
    const timeB = new Date(b.checkInTime || (b as any).createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.ticketNumber || 0) - (b.ticketNumber || 0);
  };

  // 1. Combined pool eligible for this chair (specific preference OR universal), strictly FIFO ordered
  const eligibleTickets = waitingTickets
    .filter((t) => !t.stylistId || (activeStylist && t.stylistId === activeStylist.id))
    .sort(sortByArrival);

  // 2. Tickets requesting a different stylist (strictly FIFO ordered)
  const otherStylistsTickets = waitingTickets
    .filter((t) => activeStylist && t.stylistId && t.stylistId !== activeStylist.id)
    .sort(sortByArrival);

  // 3. Paused tickets (stepped out for chai/market)
  const sortedPausedTickets = [...pausedTickets].sort(sortByArrival);

  const displayedList =
    activeTab === "YOURS"
      ? eligibleTickets
      : activeTab === "OTHER"
      ? otherStylistsTickets
      : sortedPausedTickets;

  return (
    <Card className="border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Users className="h-4 w-4 text-amber-400" />
            <span>Waiting Clients</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            {eligibleTickets.length} eligible for your chair ({otherStylistsTickets.length} for other chairs)
          </CardDescription>
        </div>
        <div className="flex items-center gap-1.5">
          {pausedTickets.length > 0 && (
            <Badge variant="outline" className="border-blue-500/40 text-blue-300 text-[10px] gap-1">
              <Coffee className="h-3 w-3 text-amber-400 inline" />
              <span>{pausedTickets.length} Away</span>
            </Badge>
          )}
          <Badge variant="secondary" className="font-mono text-xs">
            {waitingTickets.length} Active
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Queue Filter Segmented Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("YOURS")}
            className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
              activeTab === "YOURS"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Your Chair ({eligibleTickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("OTHER")}
            className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
              activeTab === "OTHER"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Other Chairs ({otherStylistsTickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PAUSED")}
            className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
              activeTab === "PAUSED"
                ? "bg-blue-600 text-white shadow-sm"
                : pausedTickets.length > 0
                ? "text-blue-300 hover:text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Coffee className="h-3.5 w-3.5 text-amber-400" />
            <span>Away ({pausedTickets.length})</span>
          </button>
        </div>

        {/* Tickets List */}
        {displayedList.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            {activeTab === "YOURS"
              ? "No clients currently waiting for your chair. Ready for walk-ins!"
              : activeTab === "OTHER"
              ? "No clients waiting for other chairs."
              : "No clients currently stepped out or on hold."}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-[460px] overflow-y-auto pr-1">
            {displayedList.map((t, idx) => {
              const isSpecific = activeStylist && t.stylistId === activeStylist.id;
              const isUniversal = !t.stylistId;
              const isPaused = t.status === "PAUSED";

              return (
                <div
                  key={t.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-amber-400 font-mono text-sm shrink-0">
                      #{t.ticketNumber}
                    </span>
                    <div>
                      <p className="font-bold text-white text-sm">{t.customerName}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        {isPaused ? (
                          <span className="text-blue-400 font-semibold flex items-center gap-0.5">
                            <Coffee className="h-3 w-3 inline text-amber-400" /> Stepped Out / Errand
                          </span>
                        ) : isSpecific ? (
                          <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                            ★ Requested You
                          </span>
                        ) : isUniversal ? (
                          <span className="text-blue-400 font-semibold flex items-center gap-0.5">
                            <Shuffle className="h-3 w-3 inline" /> First Available
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Requested another barber
                          </span>
                        )}
                        {!isPaused && (
                          <>
                            <span>·</span>
                            <span className="text-slate-400">
                              Wait: {t.estimatedWaitMinutes > 0 ? t.estimatedWaitMinutes : (idx > 0 ? Math.max(5, idx * 15) : 3)}m
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-right">
                    <Badge
                      variant={
                        t.status === "CALLED" || t.status === "SUMMONED"
                          ? "warning"
                          : t.status === "IN_SERVICE" || t.status === "IN_CHAIR"
                          ? "success"
                          : t.status === "SOFT_BUMPED"
                          ? "outline"
                          : t.status === "PAUSED"
                          ? "outline"
                          : "secondary"
                      }
                      className={`text-[10px] ${t.status === "PAUSED" ? "border-blue-500/50 text-blue-300" : ""}`}
                    >
                      {t.status === "SUMMONED" || t.status === "CALLED"
                        ? "SUMMONED"
                        : t.status === "IN_CHAIR" || t.status === "IN_SERVICE"
                        ? "IN CHAIR"
                        : t.status === "SOFT_BUMPED"
                        ? "3m HOLD"
                        : t.status === "PAUSED"
                        ? "PAUSED"
                        : `Pos #${idx + 1}`}
                    </Badge>

                    {/* Paused Tab Action: Resume / Customer Returned */}
                    {activeTab === "PAUSED" && onResumeTicket && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onResumeTicket(t)}
                        disabled={processingAction}
                        className="h-7 px-2.5 text-[11px] border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 font-bold gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Resume</span>
                      </Button>
                    )}

                    {/* Active Tab Actions: Call to Chair & Pause */}
                    {activeTab === "YOURS" && (t.status === "WAITING" || t.status === "SOFT_BUMPED") && (
                      <div className="flex items-center gap-1">
                        {onTransferTicket && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onTransferTicket(t)}
                            disabled={processingAction}
                            title="Transfer client to another barber chair"
                            className="h-7 px-2 text-[11px] text-slate-400 hover:text-purple-300 hover:bg-purple-950/40"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onPauseTicket && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onPauseTicket(t)}
                            disabled={processingAction}
                            title="Mark stepped out for chai/errand"
                            className="h-7 px-2 text-[11px] text-slate-400 hover:text-blue-300 hover:bg-blue-950/40"
                          >
                            <Coffee className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSummonSpecific(t)}
                          disabled={processingAction || hasCurrentlyServing}
                          className="h-7 px-2.5 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-bold"
                        >
                          Call to Chair
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
