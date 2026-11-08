"use client";

import React from "react";
import type { Ticket } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { triggerHaptic } from "@/lib/haptics";
import { Users } from "lucide-react";

interface StaffWaitingQueueProps {
  waitingTickets: Ticket[];
  actionLoading: boolean;
  hasInChairTicket: boolean;
  onStartService: (ticketId: string) => void;
}

export function StaffWaitingQueue({
  waitingTickets,
  actionLoading,
  hasInChairTicket,
  onStartService,
}: StaffWaitingQueueProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span>Waiting Clients ({waitingTickets.length})</span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
            Auto-Sorted
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        {waitingTickets.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            Lounge is clear. No waiting clients.
          </div>
        ) : (
          <div className="space-y-2">
            {waitingTickets.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2 transition-colors hover:border-slate-700"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-amber-400">#{t.ticketNumber}</span>
                    <span className="text-xs font-bold text-white truncate">{t.customerName}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.serviceName}</p>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    triggerHaptic("tap");
                    onStartService(t.id);
                  }}
                  disabled={actionLoading || hasInChairTicket}
                  className="text-xs bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-bold h-9 px-3 rounded-lg border border-slate-700 transition-colors shrink-0 active:scale-95 disabled:opacity-40"
                >
                  Seat Now
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
