import React, { useState } from "react";
import type { Ticket, Service } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveServiceTimer } from "@/components/live-service-timer";
import { formatCurrency, maskPhone } from "@/lib/utils";
import { CheckCircle2, Sparkles, ShieldCheck, HeartHandshake, FileText, Check } from "lucide-react";

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

const PRESET_GROOMING_TAGS = [
  { id: "Sensitive Skin", label: "Sensitive Skin", icon: "🛡️" },
  { id: "Low Fade", label: "Low Fade", icon: "🧔" },
  { id: "Scissor Only", label: "Scissor Only", icon: "✂️" },
  { id: "Light Beard Trim", label: "Light Trim", icon: "🪒" },
  { id: "Dry Scalp", label: "Dry Scalp", icon: "🧴" },
  { id: "Zero Machine", label: "Zero Machine", icon: "⚡" },
];

export function StationInServiceCard({
  currentlyServing,
  editableBill,
  processingAction,
  availableAddOns,
  isUpdatingAddon,
  onToggleAddOn,
  onToggleGroomingTag,
  onUpdateNotes,
  onProceedToCheckout,
  onOpenAddServices,
}: StationInServiceCardProps) {
  const [localNote, setLocalNote] = useState(currentlyServing.notes || "");
  const [isEditingNote, setIsEditingNote] = useState(false);

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

  const handleSaveNote = () => {
    setIsEditingNote(false);
    if (onUpdateNotes && localNote !== currentlyServing.notes) {
      onUpdateNotes(localNote);
    }
  };

  return (
    <Card className="border-2 border-emerald-500/80 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 p-6 sm:p-8 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-emerald-500/30">
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

      {/* Client RAM Live Service Progress Bar & Overtime Monitor */}
      <LiveServiceTimer
        startedTime={startedTime}
        estimatedDurationMinutes={estimatedDuration}
        variant="station"
      />

      {/* Customer Header + Loyalty & Visit Intelligence */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-3xl bg-emerald-500 text-slate-950 font-black text-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
            #{currentlyServing.ticketNumber}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl sm:text-3xl font-black text-white">{currentlyServing.customerName}</h3>
              {isReturning ? (
                <Badge className="text-xs px-2.5 py-0.5 font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <HeartHandshake className="h-3.5 w-3.5 text-amber-400" />
                  <span>⭐ {visitCount === 2 ? "2nd Visit" : `${visitCount}th Visit`} · Regular VIP</span>
                </Badge>
              ) : (
                <Badge className="text-xs px-2.5 py-0.5 font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  🆕 First-Time Guest
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1 flex-wrap">
              <span>{maskPhone(currentlyServing.customerPhone) || "Walk-in Guest"}</span>
              {currentlyServing.lastServiceName && (
                <span className="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-900/60 px-2 py-0.5 rounded-lg">
                  Last visit: {currentlyServing.lastServiceName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-right min-w-[220px] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Selected Service
            </span>
            {onOpenAddServices && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={onOpenAddServices}
                className="h-7 px-2.5 text-[11px] border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-bold rounded-lg gap-1"
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>+ Add-ons</span>
              </Button>
            )}
          </div>
          <p className="text-base font-bold text-white">
            {currentlyServing.serviceName || "Haircut Service"}
          </p>
          {currentlyServing.selectedAddOns && currentlyServing.selectedAddOns.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end pt-0.5">
              {currentlyServing.selectedAddOns.map((addon: any, idx: number) => (
                <Badge
                  key={addon.id || idx}
                  variant="outline"
                  className="text-[10px] bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-semibold"
                >
                  +{addon.name} ({formatCurrency(addon.price || 0)})
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs font-semibold text-emerald-400 pt-0.5">
            Total: {formatCurrency(currentlyServing.totalPrice || editableBill || 150)}
          </p>
        </div>
      </div>

      {/* Feature 2: 1-Tap Grooming Preference Tags & Notes */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
            <span>Grooming Preferences &amp; Tags</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            1-Tap toggles · Automatically saved for next visit
          </span>
        </div>

        {/* 1-Tap Tag Pills */}
        <div className="flex flex-wrap gap-2">
          {PRESET_GROOMING_TAGS.map((tag) => {
            const isTagActive = currentlyServing.groomingTags?.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                disabled={processingAction}
                onClick={() => onToggleGroomingTag && onToggleGroomingTag(tag.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 select-none active:scale-95 ${
                  isTagActive
                    ? "bg-sky-500/25 border-sky-400 text-sky-200 ring-1 ring-sky-400/50 shadow-md shadow-sky-500/10"
                    : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                <span className="text-sm">{tag.icon}</span>
                <span>{tag.label}</span>
                {isTagActive && <span className="text-xs text-sky-300 font-bold">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Custom Grooming Note */}
        {onUpdateNotes && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Custom client preference note (e.g. scissor cut only on top, cold water rinse)..."
              value={localNote}
              onChange={(e) => {
                setLocalNote(e.target.value);
                setIsEditingNote(true);
              }}
              onBlur={handleSaveNote}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveNote();
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
            {isEditingNote && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveNote}
                className="h-8 px-3 text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg gap-1 shrink-0"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Feature 1: 1-Tap Chair-Side Add-On Service Toggles */}
      {availableAddOns && availableAddOns.length > 0 && onToggleAddOn && (
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>1-Tap Add-on Services (Chair-Side)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Tap to instantly add or remove
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableAddOns.map((addon) => {
              const isSelected =
                currentlyServing.selectedAddOns?.some((a: any) => a.id === addon.id) ||
                currentlyServing.addOnIds?.includes(addon.id);

              return (
                <button
                  key={addon.id}
                  type="button"
                  disabled={processingAction || isUpdatingAddon}
                  onClick={() => onToggleAddOn(addon.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 select-none active:scale-95 ${
                    isSelected
                      ? "bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/50 shadow-md shadow-emerald-500/10"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  <span className="text-sm font-normal">
                    {addon.icon || (isSelected ? "✓" : "+")}
                  </span>
                  <span>{addon.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isSelected
                        ? "bg-emerald-400/20 text-emerald-300"
                        : "bg-slate-950 text-slate-400"
                    }`}
                  >
                    +{formatCurrency(addon.basePrice)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Complete Service -> Proceed to Payment Button */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
        {onOpenAddServices && (
          <Button
            size="lg"
            variant="outline"
            type="button"
            onClick={onOpenAddServices}
            disabled={processingAction}
            className="sm:w-1/3 min-h-[56px] rounded-2xl border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-200 font-bold text-base gap-2"
          >
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span>+ Add / Modify</span>
          </Button>
        )}
        <Button
          size="xl"
          onClick={onProceedToCheckout}
          disabled={processingAction}
          className={`${onOpenAddServices ? "sm:w-2/3" : "w-full"} bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl h-14 sm:h-16 rounded-2xl gap-3 shadow-xl shadow-emerald-600/20 transition-all active:scale-98`}
        >
          <CheckCircle2 className="h-7 w-7" />
          <span>✅ Complete Service &rarr; Payment</span>
        </Button>
      </div>
    </Card>
  );
}
