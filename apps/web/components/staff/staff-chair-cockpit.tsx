"use client";

import React from "react";
import type { Ticket, Service } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveServiceTimer } from "@/components/live-service-timer";
import { formatCurrency, maskPhone } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { ServiceIcon } from "@/components/ui/service-icon";
import {
  Armchair,
  CheckCircle2,
  Clock,
  Volume2,
  Phone,
  Play,
  RotateCcw,
  Plus,
  Minus,
  ArrowRightLeft,
} from "lucide-react";

interface StaffChairCockpitProps {
  myInChairTicket?: Ticket | null;
  mySummonedTicket?: Ticket | null;
  waitingCount: number;
  services: Service[];
  selectedServiceId: string;
  customDurationMinutes: number;
  actionLoading: boolean;
  onSelectServicePreset: (service: Service) => void;
  onAdjustDuration: (deltaMinutes: number) => void;
  onSetPresetDuration: (minutes: number) => void;
  onCallNext: () => void;
  onStartService: (ticketId: string) => void;
  onFinishService: (ticket: Ticket) => void;
  onBumpTicket: (ticketId: string) => void;
  onTransferTicket: (ticket: Ticket) => void;
}

export function StaffChairCockpit({
  myInChairTicket,
  mySummonedTicket,
  waitingCount,
  services,
  selectedServiceId,
  customDurationMinutes,
  actionLoading,
  onSelectServicePreset,
  onAdjustDuration,
  onSetPresetDuration,
  onCallNext,
  onStartService,
  onFinishService,
  onBumpTicket,
  onTransferTicket,
}: StaffChairCockpitProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
      <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Armchair className="h-5 w-5 text-amber-400" />
            <span>Mirror Chair Cockpit</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 mt-0.5">
            Live operational station for your active customer
          </CardDescription>
        </div>

        <Badge
          variant={myInChairTicket ? "success" : mySummonedTicket ? "warning" : "secondary"}
          className="text-xs px-3 py-1 font-bold uppercase"
        >
          {myInChairTicket ? "IN SERVICE" : mySummonedTicket ? "CALLING..." : "EMPTY CHAIR"}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {/* State A: Client is actively In-Chair */}
        {myInChairTicket ? (
          <div className="space-y-5">
            {/* Customer Details Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Current In-Chair Client
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  #{myInChairTicket.ticketNumber} • {myInChairTicket.customerName}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{maskPhone(myInChairTicket.customerPhone)}</span>
                </p>
              </div>

              <div className="sm:text-right">
                <Badge variant="purple" className="text-xs font-bold px-3 py-1">
                  {myInChairTicket.serviceName}
                </Badge>
                <p className="text-lg font-black text-white mt-1">
                  {formatCurrency(
                    Math.max(0, (myInChairTicket.totalPrice ?? 100) - (myInChairTicket.couponDiscount || 0))
                  )}
                </p>
                {myInChairTicket.couponCode && (
                  <span className="text-[10px] font-mono text-amber-300 block">
                    🎟️ {myInChairTicket.couponCode} (-₹{myInChairTicket.couponDiscount || 0})
                  </span>
                )}
              </div>
            </div>

            {/* Service Selection & Estimated Duration Calibration */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span>Service Selection &amp; Estimated Duration Time</span>
                </span>
                <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  {customDurationMinutes} Mins Allocated
                </span>
              </div>

              {/* Services Chips */}
              <div className="flex flex-wrap gap-2">
                {services.map((srv) => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("tap");
                      onSelectServicePreset(srv);
                    }}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      selectedServiceId === srv.id
                        ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                        : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <ServiceIcon icon={srv.icon} size={16} />
                    <span>{srv.name}</span>
                    <span className="opacity-75">({srv.estimatedDurationMinutes}m)</span>
                  </button>
                ))}
              </div>

              {/* Fast Quick-Adjust Time Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Quick Adjust:</span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("tap");
                    onAdjustDuration(-5);
                  }}
                  className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 active:scale-95"
                >
                  <Minus className="h-3 w-3" />
                  <span>5m</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("tap");
                    onAdjustDuration(5);
                  }}
                  className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 active:scale-95"
                >
                  <Plus className="h-3 w-3" />
                  <span>5m</span>
                </button>

                {[15, 20, 30, 45].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      triggerHaptic("tap");
                      onSetPresetDuration(preset);
                    }}
                    className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-colors active:scale-95 ${
                      customDurationMinutes === preset
                        ? "bg-blue-600 text-white font-black shadow-sm"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
            </div>

            {/* Live Service Timer (Client In-Memory Compute) */}
            <LiveServiceTimer
              startedTime={(myInChairTicket as any).startedTime || myInChairTicket.createdAt}
              estimatedDurationMinutes={customDurationMinutes}
              variant="station"
            />

            {/* Actions for In-Chair */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                onClick={() => {
                  triggerHaptic("complete");
                  onFinishService(myInChairTicket);
                }}
                disabled={actionLoading}
                className="flex-1 min-h-[50px] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.99]"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>Complete Cut &amp; Collect Payment</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  triggerHaptic("tap");
                  onBumpTicket(myInChairTicket.id);
                }}
                disabled={actionLoading}
                className="min-h-[50px] px-4 border-slate-700 bg-slate-900 text-slate-300 hover:text-white rounded-xl gap-2 text-xs font-semibold"
                title="Hold client service with 3-minute grace bump"
              >
                <RotateCcw className="h-4 w-4" />
                <span>+3m Hold</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  triggerHaptic("tap");
                  onTransferTicket(myInChairTicket);
                }}
                disabled={actionLoading}
                className="min-h-[50px] px-4 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 rounded-xl gap-2 text-xs font-semibold"
                title="1-Tap hand over client to another stylist"
              >
                <ArrowRightLeft className="h-4 w-4 text-amber-400" />
                <span>Transfer Chair</span>
              </Button>
            </div>
          </div>
        ) : mySummonedTicket ? (
          /* State B: Client is Summoned to Chair */
          <div className="space-y-6 text-center py-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
              <div className="flex items-center justify-center gap-2 text-base font-bold">
                <Volume2 className="h-5 w-5 animate-pulse" />
                <span>Summoning Ticket #{mySummonedTicket.ticketNumber} ({mySummonedTicket.customerName})</span>
              </div>
              <p className="text-xs text-slate-400">
                The client has been alerted via Audio Chime and phone. Tap below when they sit in your chair.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={() => {
                  triggerHaptic("tap");
                  onStartService(mySummonedTicket.id);
                }}
                disabled={actionLoading}
                className="min-h-[50px] px-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl gap-2 shadow-xl shadow-amber-500/25 active:scale-95"
              >
                <Play className="h-5 w-5 fill-slate-950" />
                <span>Client is Seated • Start Timer</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  triggerHaptic("tap");
                  onTransferTicket(mySummonedTicket);
                }}
                disabled={actionLoading}
                className="min-h-[50px] px-5 border-slate-700 bg-slate-900 text-slate-300 hover:text-white rounded-xl gap-2 text-xs font-semibold"
              >
                <ArrowRightLeft className="h-4 w-4 text-amber-400" />
                <span>Transfer</span>
              </Button>
            </div>
          </div>
        ) : (
          /* State C: Chair is Open & Empty */
          <div className="text-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400 shadow-inner">
              <Armchair className="h-8 w-8 text-slate-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Your Chair is Ready for the Next Client</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {waitingCount > 0
                  ? `${waitingCount} client(s) waiting in the lounge. Tap below to summon the next walk-in.`
                  : "No one currently waiting. Relax or check your tools."}
              </p>
            </div>

            <Button
              onClick={() => {
                triggerHaptic("summon");
                onCallNext();
              }}
              disabled={actionLoading || waitingCount === 0}
              className="min-h-[52px] px-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-amber-500/20 gap-2 active:scale-95 disabled:opacity-50"
            >
              <Volume2 className="h-5 w-5" />
              <span>Summon Next Walk-In</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
