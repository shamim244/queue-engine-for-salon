import React from "react";
import type { Ticket } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, maskPhone } from "@/lib/utils";
import {
  Armchair,
  RefreshCw,
  Check,
  Volume2,
  X,
} from "lucide-react";

interface ActiveQueueTableProps {
  activeTickets: Ticket[];
  loading: boolean;
  actionLoadingId: string | null;
  onRefresh: () => void;
  onOpenCheckout: (ticket: Ticket) => void;
  onOpenSeatModal: (ticket: Ticket) => void;
  onSummon: (ticketId: string) => void;
  onSoftBump: (ticketId: string) => void;
  onRequestCancel: (ticket: Ticket) => void;
  onOpenQuickAdd: () => void;
}

export function ActiveQueueTable({
  activeTickets,
  loading,
  actionLoadingId,
  onRefresh,
  onOpenCheckout,
  onOpenSeatModal,
  onSummon,
  onSoftBump,
  onRequestCancel,
  onOpenQuickAdd,
}: ActiveQueueTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>Active Queue Clients</span>
            <Badge variant="default" className="text-xs">
              {activeTickets.length} Active
            </Badge>
          </CardTitle>
          <CardDescription>
            Full front-desk control: summon, seat, hold, or bill directly.
          </CardDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="text-xs gap-1.5 border-slate-700 hover:text-white min-h-[44px] sm:min-h-[36px]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent>
        {activeTickets.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-3">
            <Armchair className="h-10 w-10 mx-auto text-slate-600 stroke-1" />
            <p className="text-sm font-medium">No clients currently waiting in the queue.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenQuickAdd}
              className="text-xs text-amber-400 border-amber-500/40 min-h-[44px]"
            >
              + Add Walk-In Client Now
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {activeTickets.map((ticket) => {
              const isTicketLoading = actionLoadingId === ticket.id;
              const isSeated = ticket.status === "IN_CHAIR" || ticket.status === "IN_SERVICE";
              const isSummoned = ticket.status === "SUMMONED" || ticket.status === "CALLED";
              const isSoftBumped = ticket.status === "SOFT_BUMPED";

              return (
                <div
                  key={ticket.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                >
                  {/* Client details */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-xl border flex items-center justify-center font-black text-base shrink-0 shadow-inner ${
                        isSeated
                          ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                          : isSummoned
                          ? "bg-amber-950/40 border-amber-500/40 text-amber-400 animate-pulse"
                          : "bg-slate-800 border-slate-700/80 text-white"
                      }`}
                    >
                      #{ticket.ticketNumber}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">
                          {ticket.customerName}
                        </span>
                        {isSeated && (
                          <Badge variant="success" className="text-[10px] py-0">
                            IN CHAIR
                          </Badge>
                        )}
                        {isSummoned && (
                          <Badge variant="warning" className="text-[10px] py-0 animate-pulse">
                            SUMMONED
                          </Badge>
                        )}
                        {isSoftBumped && (
                          <Badge variant="secondary" className="text-[10px] py-0 text-slate-300">
                            HELD 3M
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {ticket.customerPhone ? maskPhone(ticket.customerPhone) : "Walk-in Guest"} ·{" "}
                        <span className="text-slate-300">{ticket.serviceName || "Haircut"}</span> ·{" "}
                        <span className="text-emerald-400 font-semibold font-mono">
                          {formatCurrency(ticket.totalPrice || 100)}
                        </span>{" "}
                        {ticket.estimatedWaitMinutes > 0 && (
                          <>
                            · wait: <span className="text-blue-400 font-mono">{ticket.estimatedWaitMinutes}m</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Front Desk Direct Action Buttons with 44px min touch target */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {isSeated ? (
                      <Button
                        size="sm"
                        onClick={() => onOpenCheckout(ticket)}
                        disabled={isTicketLoading}
                        className="min-h-[44px] sm:min-h-[32px] text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Finish & Bill
                      </Button>
                    ) : isSummoned ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onOpenSeatModal(ticket)}
                          disabled={isTicketLoading}
                          className="min-h-[44px] sm:min-h-[32px] text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1"
                        >
                          <Armchair className="h-3.5 w-3.5" />
                          Seat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSoftBump(ticket.id)}
                          disabled={isTicketLoading}
                          className="min-h-[44px] sm:min-h-[32px] text-xs px-2.5 border-slate-700 text-slate-300 hover:text-white"
                          title="Hold place for 3 minutes"
                        >
                          Hold 3m
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSummon(ticket.id)}
                          disabled={isTicketLoading}
                          className="min-h-[44px] sm:min-h-[32px] text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 gap-1 font-semibold"
                          title="Send WhatsApp ready notification"
                        >
                          <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                          Summon
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onOpenSeatModal(ticket)}
                          disabled={isTicketLoading}
                          className="min-h-[44px] sm:min-h-[32px] text-xs gap-1 font-semibold"
                        >
                          <Armchair className="h-3.5 w-3.5" />
                          Seat
                        </Button>
                      </>
                    )}

                    {/* Quick Cancel button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRequestCancel(ticket)}
                      disabled={isTicketLoading}
                      className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Remove / Cancel Ticket"
                    >
                      <X className="h-4 w-4" />
                    </Button>
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
