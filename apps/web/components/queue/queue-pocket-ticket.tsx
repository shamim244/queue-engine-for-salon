import React from "react";
import type { Salon, Ticket } from "@/lib/api";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveServiceTimer } from "@/components/live-service-timer";
import { maskPhone } from "@/lib/utils";
import {
  Volume2,
  Scissors,
  Coffee,
  Shuffle,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Smartphone,
  Share2,
  Copy,
  Check,
  Sun,
} from "lucide-react";

interface QueuePocketTicketProps {
  myTicket: Ticket;
  salon: Salon | null;
  peopleAhead: number;
  myBarberSpecificAhead: number;
  estimatedWaitMin: number;
  estimatedEtaWindow: {
    clockText: string;
    exactTarget: string;
    tipText: string;
    isReady: boolean;
  };
  onPlayChime: () => void;
  vibrationEnabled?: boolean;
  onToggleVibration?: () => void;
  supportsVibration?: boolean;
  wakeLockEnabled?: boolean;
  onToggleWakeLock?: () => void;
  supportsWakeLock?: boolean;
  allowWakeLock?: boolean;
  onShareWhatsApp?: () => void;
  onCopyLink?: () => void;
  isCopied?: boolean;
  onOpenAddServices: () => void;
  onPauseTicket: () => void;
  onResumeTicket: () => void;
  onOpenChangeBarber: () => void;
  onOpenCancel: () => void;
  pausingTicket: boolean;
  resumingTicket: boolean;
}

export function QueuePocketTicket({
  myTicket,
  salon,
  peopleAhead,
  myBarberSpecificAhead,
  estimatedWaitMin,
  estimatedEtaWindow,
  onPlayChime,
  vibrationEnabled = true,
  onToggleVibration,
  supportsVibration = false,
  wakeLockEnabled = false,
  onToggleWakeLock,
  supportsWakeLock = false,
  allowWakeLock = true,
  onShareWhatsApp,
  onCopyLink,
  isCopied = false,
  onOpenAddServices,
  onPauseTicket,
  onResumeTicket,
  onOpenChangeBarber,
  onOpenCancel,
  pausingTicket,
  resumingTicket,
}: QueuePocketTicketProps) {
  const isSummoned = myTicket.status === "CALLED" || myTicket.status === "SUMMONED";
  const isInChair = myTicket.status === "IN_SERVICE" || myTicket.status === "IN_CHAIR";
  const isPaused = myTicket.status === "PAUSED";
  const phoneDisplay = maskPhone(myTicket.customerPhone);

  return (
    <Card className="border-2 border-amber-500/60 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-amber-500/10">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs uppercase tracking-widest font-black text-amber-400">
              Live Pocket Ticket
            </span>
          </div>
          <Badge
            variant={
              isSummoned
                ? "warning"
                : isInChair
                ? "success"
                : "secondary"
            }
            className="text-xs px-3 py-1 uppercase font-bold"
          >
            {isSummoned
              ? "CHAIR READY"
              : isInChair
              ? "IN CHAIR"
              : "WAITING IN QUEUE"}
          </Badge>
        </div>

        <div className="flex items-baseline justify-between pt-2">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ticket #{myTicket.ticketNumber}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              For <span className="text-white font-semibold">{myTicket.customerName}</span>
              {phoneDisplay && (
                <span className="text-slate-400 font-normal"> ({phoneDisplay})</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Service &amp; Bill</span>
            <span className="text-sm font-bold text-amber-400">{myTicket.serviceName}</span>
            {myTicket.selectedAddOns && myTicket.selectedAddOns.length > 0 && (
              <span className="text-[10px] text-slate-400 block max-w-[150px] truncate">
                +{myTicket.selectedAddOns.map((a: any) => a.name).join(", ")}
              </span>
            )}
            <span className="text-xs font-bold text-emerald-400 block mt-0.5 font-mono">
              ₹{myTicket.totalPrice || 0}
            </span>
          </div>
        </div>

        {/* Quick Utility Action Bar: WhatsApp Share, Copy Link, Haptic Vibration Toggle */}
        <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-800/80 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {onShareWhatsApp && (
              <button
                type="button"
                onClick={onShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all min-h-[36px]"
                title="Share live ticket tracking link on WhatsApp"
              >
                <Share2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Share on WhatsApp</span>
              </button>
            )}

            {onCopyLink && (
              <button
                type="button"
                onClick={onCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 active:scale-95 transition-all min-h-[36px]"
                title="Copy ticket URL to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {supportsVibration && onToggleVibration && (
              <button
                type="button"
                onClick={onToggleVibration}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all min-h-[36px] ${
                  vibrationEnabled
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                }`}
                title={vibrationEnabled ? "Turn off vibration alert" : "Turn on vibration alert"}
              >
                <Smartphone className={`h-3.5 w-3.5 ${vibrationEnabled ? "text-amber-400 animate-pulse" : "text-slate-500"}`} />
                <span>{vibrationEnabled ? "Vibrate: ON" : "Vibrate: OFF"}</span>
              </button>
            )}

            {supportsWakeLock && allowWakeLock && onToggleWakeLock && (
              <button
                type="button"
                onClick={onToggleWakeLock}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all min-h-[36px] ${
                  wakeLockEnabled
                    ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                }`}
                title={wakeLockEnabled ? "Screen will stay awake · Click to release" : "Keep screen awake while waiting in lounge"}
              >
                <Sun className={`h-3.5 w-3.5 ${wakeLockEnabled ? "text-blue-400 animate-pulse" : "text-slate-500"}`} />
                <span>{wakeLockEnabled ? "Screen Awake: ON" : "Screen Awake: OFF"}</span>
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Pulsating Summon Banner */}
        {isSummoned && (
          <div className="p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 text-sm font-bold text-center space-y-2 animate-pulse">
            <div className="flex items-center justify-center gap-2 text-lg text-amber-300">
              <Volume2 className="h-6 w-6" />
              <span>YOUR CHAIR IS READY!</span>
            </div>
            <p className="text-xs text-amber-100 font-normal">
              Please step up to the mirror chair. Your barber is ready for your cut!
            </p>
            <Button
              size="sm"
              onClick={onPlayChime}
              className="bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 gap-1.5 rounded-xl h-10 px-4"
            >
              <Volume2 className="h-4 w-4" />
              <span>Play Chime {vibrationEnabled && supportsVibration ? "& Vibrate" : "Alert"}</span>
            </Button>
          </div>
        )}

        {/* Progress Timer or Waiting Stats */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Scissors className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-slate-400">Queue Routing:</span>
            <span className="font-bold text-white">
              {myTicket.stylistId
                ? (salon?.stylists?.find((s) => s.id === myTicket.stylistId)?.name || "Dedicated Barber")
                : "Fastest Available Chair"}
            </span>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
              {myTicket.stylistId ? "Locked-In Chair" : "Universal Pool"}
            </Badge>
          </div>

          {(myTicket.status === "WAITING" || myTicket.status === "SOFT_BUMPED" || isPaused) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={onOpenAddServices}
                className="h-8 px-3 text-[11px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-bold shrink-0 rounded-lg gap-1"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-400" />
                <span>+ Add Services</span>
              </Button>

              {!isPaused && (
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={onPauseTicket}
                  disabled={pausingTicket}
                  className="h-8 px-3 text-[11px] border-blue-500/40 text-blue-300 hover:bg-blue-500/10 font-bold shrink-0 rounded-lg gap-1"
                >
                  <Coffee className="h-3.5 w-3.5 text-amber-400" />
                  <span>Pause Spot</span>
                </Button>
              )}

              {salon?.stylists && salon.stylists.length > 0 && !isPaused && (
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={onOpenChangeBarber}
                  className="h-8 px-3 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-bold shrink-0 rounded-lg"
                >
                  <Shuffle className="h-3.5 w-3.5 mr-1" />
                  <span>Change Barber</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {isPaused ? (
          <div className="p-4 rounded-2xl bg-blue-950/40 border-2 border-blue-500/50 text-blue-200 text-sm space-y-3 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <Coffee className="h-5 w-5 text-amber-400" />
                <span>Spot Paused · Errand / Chai Mode</span>
              </div>
              <Badge variant="outline" className="border-blue-400 text-blue-300 text-[10px]">
                HOLDING SPOT
              </Badge>
            </div>
            <p className="text-xs text-blue-200 leading-relaxed">
              Your spot in line is safe! Barbers will not call your number while you are away. When you walk back into the salon, tap below to get into the next open chair.
            </p>
            <Button
              size="lg"
              onClick={onResumeTicket}
              disabled={resumingTicket}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl gap-2 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>👋 I&apos;m Back at Salon (Ready for Chair)</span>
            </Button>
          </div>
        ) : isInChair ? (
          <LiveServiceTimer
            startedTime={(myTicket as any).startedTime || (myTicket as any).seatedAt || myTicket.createdAt}
            estimatedDurationMinutes={myTicket.estimatedWaitMinutes || 20}
            variant="customer"
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block font-medium">
                  {myTicket.stylistId ? "People Ahead in Chair Line" : "People Ahead"}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-white">
                  {myTicket.stylistId ? myBarberSpecificAhead : peopleAhead}
                </span>
                {myTicket.stylistId && (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    ({peopleAhead} in whole shop)
                  </span>
                )}
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block font-medium">Est. Wait</span>
                <span className="text-3xl sm:text-4xl font-black text-amber-400">~{estimatedWaitMin}m</span>
              </div>
            </div>

            {/* Wall-Clock Arrival Target Banner (Eliminates Mental Math) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 text-center space-y-1 shadow-lg">
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Exact Arrival Target (Clock Time)</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {estimatedEtaWindow.clockText}
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {estimatedEtaWindow.tipText}
              </p>
            </div>
          </>
        )}

        {/* Cancel Button */}
        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenCancel}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 min-h-[44px] px-4 rounded-xl"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            <span>Cancel Ticket</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
