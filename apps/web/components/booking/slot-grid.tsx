"use client";

import React from "react";
import type { AppointmentSlot } from "@/lib/api";
import { Sun, CloudSun, Moon, Clock, CheckCircle2 } from "lucide-react";

interface SlotGridProps {
  slots: AppointmentSlot[];
  selectedSlot: string | null;
  onSelectSlot: (time: string) => void;
  isLoading?: boolean;
}

export function SlotGrid({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading = false,
}: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 animate-pulse py-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-slate-800/60" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400">
        <Clock className="mx-auto h-8 w-8 text-slate-500 mb-2" />
        <p className="text-sm font-medium">No slots available for this date.</p>
        <p className="text-xs text-slate-500 mt-1">Please select another date or stylist.</p>
      </div>
    );
  }

  // Group slots into Morning, Afternoon, Evening
  const morningSlots = slots.filter((s) => {
    const h = parseInt(s.time.split(":")[0], 10);
    return h < 12;
  });

  const afternoonSlots = slots.filter((s) => {
    const h = parseInt(s.time.split(":")[0], 10);
    return h >= 12 && h < 17;
  });

  const eveningSlots = slots.filter((s) => {
    const h = parseInt(s.time.split(":")[0], 10);
    return h >= 17;
  });

  const renderSlotGroup = (title: string, icon: React.ReactNode, group: AppointmentSlot[]) => {
    if (group.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
          {icon}
          <span>{title}</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {group.map((slot) => {
            const isSelected = selectedSlot === slot.time;
            const isAvailable = slot.available;

            return (
              <button
                key={slot.time}
                type="button"
                disabled={!isAvailable}
                onClick={() => onSelectSlot(slot.time)}
                className={`relative min-h-[48px] rounded-xl font-mono text-sm font-semibold transition-all flex flex-col items-center justify-center border p-2 select-none active:scale-95 ${
                  !isAvailable
                    ? "bg-slate-900/40 border-slate-800/50 text-slate-600 line-through cursor-not-allowed"
                    : isSelected
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 font-bold scale-[1.02]"
                    : "bg-slate-900/90 border-slate-800 text-slate-200 hover:border-amber-500/60 hover:text-white"
                }`}
              >
                <span>{slot.time}</span>
                {!isAvailable && (
                  <span className="text-[9px] uppercase tracking-wider no-underline text-slate-600 block -mt-0.5">
                    Booked
                  </span>
                )}
                {isSelected && (
                  <CheckCircle2 className="absolute top-1 right-1 h-3.5 w-3.5 text-slate-950" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {renderSlotGroup("Morning", <Sun className="h-3.5 w-3.5 text-amber-400" />, morningSlots)}
      {renderSlotGroup("Afternoon", <CloudSun className="h-3.5 w-3.5 text-orange-400" />, afternoonSlots)}
      {renderSlotGroup("Evening", <Moon className="h-3.5 w-3.5 text-indigo-400" />, eveningSlots)}
    </div>
  );
}
