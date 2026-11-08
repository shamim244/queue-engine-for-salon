import React from "react";
import type { Ticket } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { maskPhone } from "@/lib/utils";
import { Users } from "lucide-react";

interface QueueLiveFloorProps {
  activeTickets: Ticket[];
  chairsServing: Ticket[];
  waitingSequence: Ticket[];
  myTicket: Ticket | null;
}

export function QueueLiveFloor({
  activeTickets,
  chairsServing,
  waitingSequence,
  myTicket,
}: QueueLiveFloorProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-blue-400" />
            <span>Live Floor &amp; Waiting List</span>
          </CardTitle>
          <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
            {activeTickets.length} Total on Floor
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Currently Serving Chairs */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>In Mirror Chairs ({chairsServing.length})</span>
          </span>

          {chairsServing.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              All mirror chairs currently open. Next walk-in sits down immediately!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {chairsServing.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                      #{t.ticketNumber}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate">{t.customerName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{t.serviceName}</p>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px] shrink-0">
                    In Chair
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waiting in Lounge */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
            Up Next in Lounge ({waitingSequence.length})
          </span>

          {waitingSequence.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              Zero waiting! Step inside to be served immediately.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-950/60 border border-slate-800">
              {waitingSequence.map((t, idx) => {
                const isMe = myTicket?.id === t.id;
                const phoneDisplay = maskPhone(t.customerPhone);
                return (
                  <div
                    key={t.id}
                    className={`px-3.5 py-3 flex items-center justify-between text-xs ${
                      isMe ? "bg-amber-500/10 text-amber-300 font-bold" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      <span className="font-mono font-bold text-slate-400 shrink-0">#{t.ticketNumber}</span>
                      <span className="font-semibold truncate">
                        {isMe ? `${t.customerName} (You)` : t.customerName || `Guest #${t.ticketNumber}`}
                      </span>
                      {phoneDisplay && !isMe && (
                        <span className="text-[10px] text-slate-500 font-normal shrink-0">
                          ({phoneDisplay})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">{t.serviceName}</span>
                      <Badge variant={isMe ? "warning" : "secondary"} className="text-[10px]">
                        {idx === 0 || t.estimatedWaitMinutes === 0
                          ? "Next Up"
                          : `~${t.estimatedWaitMinutes || (idx + 1) * 15}m wait`}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
