import React from "react";
import type { Ticket, Service } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveServiceTimer } from "@/components/live-service-timer";
import { StationActionDrawer } from "@/components/station/station-action-drawer";
import { formatCurrency, maskPhone } from "@/lib/utils";
import { CheckCircle2, Sparkles, HeartHandshake, ShieldCheck, FileText } from "lucide-react";

interface StationInServiceCardProps {
  currentlyServing: Ticket;
  editableBill: number;
  processingAction: boolean;
  availableAddOns?: Service[];
  isUpdatingAddon?: boolean;
  onToggleAddOn?: (addonId: string) => void;
  onToggleGroomingTag?: (tag: string) => void;
  onUpdateNotes?: (notes: string) => void;
  onProceedToCheckout: () => void;
  onOpenAddServices?: () => void;
}

export function StationInServiceCard({
  currentlyServing,
  editableBill,
  processingAction,
  availableAddOns = [],
  isUpdatingAddon = false,
  onToggleAddOn,
  onToggleGroomingTag,
  onUpdateNotes,
  onProceedToCheckout,
  onOpenAddServices,
}: StationInServiceCardProps) {
  const startedTime =
    (currentlyServing as any).startedTime ||
    (currentlyServing as any).seatedAt ||
    currentlyServing.createdAt;
  const estimatedDuration =
    (currentlyServing as any).totalDurationMinutes ||
    (currentlyServing as any).estimatedDurationMinutes ||
    20;

  const visitCount = currentlyServing.visitCount || 1;
  const isReturning = visitCount > 1;

  const activeAddOns = currentlyServing.selectedAddOns || [];
  const activeTags = currentlyServing.groomingTags || [];
  const currentTotal = currentlyServing.totalPrice || editableBill || 150;

  return (
    <Card className="border-2 border-emerald-500/80 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 p-5 sm:p-6 space-y-4 shadow-2xl">
      {/* 1. Header Row: Status + Duration */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
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

      {/* 2. Client RAM Live Service Progress Bar & Overtime Monitor */}
      <LiveServiceTimer
        startedTime={startedTime}
        estimatedDurationMinutes={estimatedDuration}
        variant="station"
      />

      {/* 3. Compact Customer Info & Billing Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90">
        <div className="flex items-center gap-3.5">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            #{currentlyServing.ticketNumber}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white">{currentlyServing.customerName}</h3>
              {isReturning ? (
                <Badge className="text-[11px] px-2 py-0.5 font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <HeartHandshake className="h-3 w-3 text-amber-400" />
                  <span>⭐ {visitCount === 2 ? "2nd Visit" : `${visitCount}th Visit`} · Regular VIP</span>
                </Badge>
              ) : (
                <Badge className="text-[11px] px-2 py-0.5 font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  🆕 First-Time Guest
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span>{maskPhone(currentlyServing.customerPhone) || "Walk-in Guest"}</span>
              {currentlyServing.lastServiceName && (
                <span className="text-amber-300/90 bg-amber-950/40 border border-amber-900/60 px-1.5 py-0.5 rounded-md text-[11px]">
                  Last visit: {currentlyServing.lastServiceName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4 min-w-[140px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {currentlyServing.serviceName || "Haircut Service"}
          </span>
          <div className="text-xl font-black text-emerald-400">
            {formatCurrency(currentTotal)}
          </div>
        </div>
      </div>

      {/* 4. Active Chips Summary (Displays ONLY active add-ons & tags without clutter) */}
      {(activeAddOns.length > 0 || activeTags.length > 0 || currentlyServing.notes) && (
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Active:
          </span>

          {activeAddOns.map((addon: any, idx: number) => (
            <Badge
              key={addon.id || idx}
              variant="outline"
              className="text-[11px] bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-semibold gap-1 py-0.5"
            >
              <span>+{addon.name}</span>
              <span className="font-mono text-[10px] text-emerald-400">({formatCurrency(addon.price || 0)})</span>
            </Badge>
          ))}

          {activeTags.map((tag: string, idx: number) => (
            <Badge
              key={idx}
              variant="outline"
              className="text-[11px] bg-sky-500/15 border-sky-500/30 text-sky-200 font-semibold py-0.5"
            >
              {tag}
            </Badge>
          ))}

          {currentlyServing.notes && (
            <span className="text-[11px] text-purple-300 italic bg-purple-950/30 border border-purple-500/30 px-2 py-0.5 rounded-md truncate max-w-xs">
              &ldquo;{currentlyServing.notes}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* 5. Sandy's 3-Button Tactile Dock + Floating Quick Drawer */}
      <StationActionDrawer
        availableAddOns={availableAddOns}
        selectedAddOns={activeAddOns}
        addOnIds={currentlyServing.addOnIds}
        groomingTags={activeTags}
        notes={currentlyServing.notes}
        processingAction={processingAction}
        isUpdatingAddon={isUpdatingAddon}
        onToggleAddOn={onToggleAddOn}
        onToggleGroomingTag={onToggleGroomingTag}
        onUpdateNotes={onUpdateNotes}
      />

      {/* 6. Primary Action Buttons (Always Visible Above Fold) */}
      <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5">
        {onOpenAddServices && (
          <Button
            size="lg"
            variant="outline"
            type="button"
            onClick={onOpenAddServices}
            disabled={processingAction}
            className="sm:w-1/3 min-h-[50px] rounded-2xl border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-200 font-bold text-sm gap-2"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>+ Add / Modify</span>
          </Button>
        )}
        <Button
          size="xl"
          onClick={onProceedToCheckout}
          disabled={processingAction}
          className={`${onOpenAddServices ? "sm:w-2/3" : "w-full"} bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg h-14 rounded-2xl gap-2.5 shadow-xl shadow-emerald-600/20 transition-all active:scale-98`}
        >
          <CheckCircle2 className="h-6 w-6" />
          <span>✅ Complete Service &rarr; Payment ({formatCurrency(currentTotal)})</span>
        </Button>
      </div>
    </Card>
  );
}
