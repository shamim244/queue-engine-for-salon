"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { AppointmentSlot } from "@/lib/api";
import { Sun, CloudSun, Moon, Clock, CheckCircle2 } from "lucide-react";

interface SlotGridProps {
  slots: AppointmentSlot[];
  selectedSlot: string | null;
  onSelectSlot: (time: string) => void;
  isLoading?: boolean;
}

type PeriodType = "MORNING" | "AFTERNOON" | "EVENING" | "ALL";

export function SlotGrid({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading = false,
}: SlotGridProps) {
  // Group slots into Morning (< 12:00), Afternoon (12:00 - 16:59), Evening (>= 17:00)
  const { morningSlots, afternoonSlots, eveningSlots } = useMemo(() => {
    const morning: AppointmentSlot[] = [];
    const afternoon: AppointmentSlot[] = [];
    const evening: AppointmentSlot[] = [];

    for (const slot of slots) {
      const hour = parseInt(slot.time.split(":")[0], 10);
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    }

    return {
      morningSlots: morning,
      afternoonSlots: afternoon,
      eveningSlots: evening,
    };
  }, [slots]);

  const morningAvail = useMemo(
    () => morningSlots.filter((s) => s.available).length,
    [morningSlots]
  );
  const afternoonAvail = useMemo(
    () => afternoonSlots.filter((s) => s.available).length,
    [afternoonSlots]
  );
  const eveningAvail = useMemo(
    () => eveningSlots.filter((s) => s.available).length,
    [eveningSlots]
  );

  // Active period preset tab state
  const [activePeriod, setActivePeriod] = useState<PeriodType>(() => {
    if (selectedSlot) {
      const h = parseInt(selectedSlot.split(":")[0], 10);
      if (h < 12) return "MORNING";
      if (h < 17) return "AFTERNOON";
      return "EVENING";
    }
    if (morningAvail > 0) return "MORNING";
    if (afternoonAvail > 0) return "AFTERNOON";
    if (eveningAvail > 0) return "EVENING";
    return "MORNING";
  });

  // Automatically switch active tab if user's selectedSlot is in a different period
  useEffect(() => {
    if (!selectedSlot) return;
    const h = parseInt(selectedSlot.split(":")[0], 10);
    if (h < 12 && activePeriod !== "MORNING" && activePeriod !== "ALL") {
      setActivePeriod("MORNING");
    } else if (h >= 12 && h < 17 && activePeriod !== "AFTERNOON" && activePeriod !== "ALL") {
      setActivePeriod("AFTERNOON");
    } else if (h >= 17 && activePeriod !== "EVENING" && activePeriod !== "ALL") {
      setActivePeriod("EVENING");
    }
  }, [selectedSlot]);

  // If active period has 0 total slots but another has available slots, auto-adapt
  useEffect(() => {
    if (slots.length === 0) return;
    if (activePeriod === "MORNING" && morningSlots.length === 0) {
      if (afternoonSlots.length > 0) setActivePeriod("AFTERNOON");
      else if (eveningSlots.length > 0) setActivePeriod("EVENING");
    } else if (activePeriod === "AFTERNOON" && afternoonSlots.length === 0) {
      if (morningSlots.length > 0) setActivePeriod("MORNING");
      else if (eveningSlots.length > 0) setActivePeriod("EVENING");
    } else if (activePeriod === "EVENING" && eveningSlots.length === 0) {
      if (morningSlots.length > 0) setActivePeriod("MORNING");
      else if (afternoonSlots.length > 0) setActivePeriod("AFTERNOON");
    }
  }, [slots, activePeriod, morningSlots.length, afternoonSlots.length, eveningSlots.length]);

  if (isLoading) {
    return (
      <div className="space-y-3 py-2 animate-pulse">
        {/* Preset Tab skeleton */}
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 rounded-2xl bg-slate-800/60" />
          <div className="h-10 rounded-2xl bg-slate-800/60" />
          <div className="h-10 rounded-2xl bg-slate-800/60" />
        </div>
        {/* Slot grid skeleton */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-800/40" />
          ))}
        </div>
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

  const renderSlotButtons = (group: AppointmentSlot[]) => {
    if (group.length === 0) {
      return (
        <div className="py-6 text-center text-xs text-slate-500 rounded-xl bg-slate-900/40 border border-slate-800/60">
          No slots in this time period.
        </div>
      );
    }

    return (
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
    );
  };

  const currentGroup =
    activePeriod === "MORNING"
      ? morningSlots
      : activePeriod === "AFTERNOON"
      ? afternoonSlots
      : activePeriod === "EVENING"
      ? eveningSlots
      : [];

  return (
    <div className="space-y-3">
      {/* Quick Period Presets - Segregated Segmented Control (Zero-Scroll Mobile UX) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
        <button
          type="button"
          onClick={() => setActivePeriod("MORNING")}
          className={`min-h-[42px] px-2 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none active:scale-95 ${
            activePeriod === "MORNING"
              ? "bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sun className="h-3.5 w-3.5 shrink-0" />
          <span>Morning</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
              activePeriod === "MORNING"
                ? "bg-slate-950/20 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {morningAvail}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActivePeriod("AFTERNOON")}
          className={`min-h-[42px] px-2 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none active:scale-95 ${
            activePeriod === "AFTERNOON"
              ? "bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <CloudSun className="h-3.5 w-3.5 shrink-0" />
          <span>Afternoon</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
              activePeriod === "AFTERNOON"
                ? "bg-slate-950/20 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {afternoonAvail}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActivePeriod("EVENING")}
          className={`min-h-[42px] px-2 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none active:scale-95 ${
            activePeriod === "EVENING"
              ? "bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Moon className="h-3.5 w-3.5 shrink-0" />
          <span>Evening</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
              activePeriod === "EVENING"
                ? "bg-slate-950/20 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {eveningAvail}
          </span>
        </button>
      </div>

      {/* Render Active Period Slots (Compact, non-scrolling) or All */}
      {activePeriod === "ALL" ? (
        <div className="space-y-4 pt-1">
          {morningSlots.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sun className="h-3 w-3 text-amber-400" /> Morning
              </span>
              {renderSlotButtons(morningSlots)}
            </div>
          )}
          {afternoonSlots.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CloudSun className="h-3 w-3 text-orange-400" /> Afternoon
              </span>
              {renderSlotButtons(afternoonSlots)}
            </div>
          )}
          {eveningSlots.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Moon className="h-3 w-3 text-indigo-400" /> Evening
              </span>
              {renderSlotButtons(eveningSlots)}
            </div>
          )}
        </div>
      ) : (
        renderSlotButtons(currentGroup)
      )}

      {/* Footer Toggle: Compact Period Presets vs View All */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
        <span>
          {activePeriod === "ALL"
            ? `${slots.length} total slots`
            : `${currentGroup.length} slots in this period`}
        </span>
        <button
          type="button"
          onClick={() => setActivePeriod(activePeriod === "ALL" ? "MORNING" : "ALL")}
          className="text-amber-400/90 hover:underline font-semibold"
        >
          {activePeriod === "ALL" ? "Show Period Tabs" : "View All Times"}
        </button>
      </div>
    </div>
  );
}
