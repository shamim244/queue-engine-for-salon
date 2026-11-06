import React from "react";
import type { Stylist, Ticket } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Armchair, Check } from "lucide-react";

interface ChairsFloorGridProps {
  stylists: Stylist[];
  inServiceTickets: Ticket[];
  summonedTickets: Ticket[];
  waitingTickets: Ticket[];
  onOpenCheckout: (ticket: Ticket) => void;
  onOpenSeatModal: (ticket: Ticket) => void;
  onSoftBump: (ticketId: string) => void;
}

export function ChairsFloorGrid({
  stylists,
  inServiceTickets,
  summonedTickets,
  waitingTickets,
  onOpenCheckout,
  onOpenSeatModal,
  onSoftBump,
}: ChairsFloorGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Armchair className="h-4 w-4 text-amber-400" />
          <span>Chairs & Stylist Floor Status</span>
        </h2>
        <span className="text-xs text-slate-400">
          {stylists.length || 1} Working {stylists.length === 1 ? "Station" : "Stations"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(stylists || []).map((stylist, idx) => {
          const seatedTicket = inServiceTickets.find((t) => t.stylistId === stylist.id);
          const summonedTicket = summonedTickets.find((t) => t.stylistId === stylist.id);

          return (
            <Card
              key={stylist.id}
              className={`relative border transition-all ${
                seatedTicket
                  ? "border-emerald-500/50 bg-emerald-950/15"
                  : summonedTicket
                  ? "border-amber-500/50 bg-amber-950/15"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-white text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-white">{stylist.name}</CardTitle>
                      <p className="text-[11px] text-slate-400">
                        {stylist.historicalAvgDurationMinutes || 25}m avg
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={seatedTicket ? "success" : summonedTicket ? "warning" : "outline"}
                    className="text-[10px] py-0"
                  >
                    {seatedTicket ? "IN SERVICE" : summonedTicket ? "SUMMONED" : "AVAILABLE"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-1">
                {seatedTicket ? (
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        #{seatedTicket.ticketNumber}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-[120px]">
                        {seatedTicket.customerName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {seatedTicket.serviceName || "Haircut"} · {formatCurrency(seatedTicket.totalPrice || 100)}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => onOpenCheckout(seatedTicket)}
                      className="w-full text-xs min-h-[44px] sm:min-h-[32px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold mt-1"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Finish & Bill
                    </Button>
                  </div>
                ) : summonedTicket ? (
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        #{summonedTicket.ticketNumber}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-[120px]">
                        {summonedTicket.customerName}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-300/80">Summoned (WhatsApp Sent)</p>
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        size="sm"
                        onClick={() => onOpenSeatModal(summonedTicket)}
                        className="flex-1 text-xs min-h-[44px] sm:min-h-[32px] bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                      >
                        Seat Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSoftBump(summonedTicket.id)}
                        className="text-xs min-h-[44px] sm:min-h-[32px] px-2.5 border-slate-700 text-slate-300"
                        title="Hold for 3 minutes if stepped out"
                      >
                        Hold 3m
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center space-y-2">
                    <p className="text-xs text-slate-400">Chair ready for next client</p>
                    {waitingTickets.length > 0 ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onOpenSeatModal(waitingTickets[0])}
                        className="w-full text-xs min-h-[44px] sm:min-h-[32px] font-semibold"
                      >
                        Seat #{waitingTickets[0].ticketNumber} Next
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-500">Queue is clear</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
