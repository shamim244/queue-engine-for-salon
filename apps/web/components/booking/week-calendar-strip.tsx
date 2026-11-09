"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from "lucide-react";

interface WeekCalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  minDate?: string; // YYYY-MM-DD (defaults to today)
  maxDaysAhead?: number; // defaults to 60 days
}

export function WeekCalendarStrip({
  selectedDate,
  onSelectDate,
  minDate,
  maxDaysAhead = 60,
}: WeekCalendarStripProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const effectiveMinDateStr = minDate || todayStr;

  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + maxDaysAhead);
    return d;
  }, [today, maxDaysAhead]);
  const maxDateStr = useMemo(() => maxDate.toISOString().slice(0, 10), [maxDate]);

  // Week offset from today (0 = current 7-day window, 1 = next 7-day window, etc.)
  const [weekOffset, setWeekOffset] = useState<number>(() => {
    if (!selectedDate) return 0;
    const sel = new Date(selectedDate + "T00:00:00");
    const diffDays = Math.floor((sel.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? Math.floor(diffDays / 7) : 0;
  });

  // Keep weekOffset in sync if selectedDate changes externally (e.g. picked via calendar)
  useEffect(() => {
    if (!selectedDate) return;
    const sel = new Date(selectedDate + "T00:00:00");
    const diffDays = Math.floor((sel.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const targetOffset = diffDays >= 0 ? Math.floor(diffDays / 7) : 0;
    if (targetOffset !== weekOffset) {
      setWeekOffset(targetOffset);
    }
  }, [selectedDate, today]);

  // Generate the 7 days for the current week window
  const weekDays = useMemo(() => {
    const days: Array<{
      dateStr: string;
      dayOfWeek: string;
      dayOfMonth: number;
      monthShort: string;
      isToday: boolean;
      isPast: boolean;
      isBeyondMax: boolean;
    }> = [];

    const startOffset = weekOffset * 7;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + startOffset + i);
      const dateStr = d.toISOString().slice(0, 10);
      const isPast = dateStr < effectiveMinDateStr;
      const isBeyondMax = dateStr > maxDateStr;

      days.push({
        dateStr,
        dayOfWeek: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        dayOfMonth: d.getDate(),
        monthShort: d.toLocaleDateString("en-US", { month: "short" }),
        isToday: dateStr === todayStr,
        isPast,
        isBeyondMax,
      });
    }

    return days;
  }, [today, weekOffset, effectiveMinDateStr, maxDateStr, todayStr]);

  // Determine current month label for display in header
  const headerMonthLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];
    if (firstDay.monthShort === lastDay.monthShort) {
      const year = new Date(firstDay.dateStr + "T00:00:00").getFullYear();
      return `${firstDay.monthShort} ${year}`;
    }
    return `${firstDay.monthShort} - ${lastDay.monthShort}`;
  }, [weekDays]);

  const canGoPrev = weekOffset > 0;
  const canGoNext = (weekOffset + 1) * 7 < maxDaysAhead;

  return (
    <div className="space-y-2 select-none">
      {/* Header: Month Label + Week Navigation + Calendar Popover Jump */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">
            {headerMonthLabel}
          </span>
          {weekOffset === 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              This Week
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Week Pagination Arrows */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90"
              title="Previous 7 Days"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90"
              title="Next 7 Days"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* 📅 Native Calendar Jump Trigger */}
          <label className="relative cursor-pointer flex items-center gap-1 h-8 px-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 text-xs text-amber-400 font-semibold transition-all shadow-sm active:scale-95">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Jump</span>
            <input
              type="date"
              min={effectiveMinDateStr}
              max={maxDateStr}
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectDate(e.target.value);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>

      {/* 7-Day Grid: Exactly 7 columns fitting 100% of mobile viewport with zero scrollbar */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {weekDays.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          const isDisabled = day.isPast || day.isBeyondMax;

          return (
            <button
              key={day.dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectDate(day.dateStr)}
              className={`relative min-h-[54px] p-1 sm:p-1.5 rounded-2xl flex flex-col items-center justify-center border transition-all text-center select-none active:scale-95 ${
                isDisabled
                  ? "bg-slate-950/40 border-slate-900 text-slate-600 opacity-40 cursor-not-allowed"
                  : isSelected
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/25 scale-[1.03] ring-2 ring-amber-400/50"
                  : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
              }`}
            >
              {/* Day of Week Abbreviation */}
              <span
                className={`text-[10px] font-bold tracking-tight block ${
                  isSelected ? "text-slate-950" : "text-slate-400"
                }`}
              >
                {day.dayOfWeek}
              </span>

              {/* Day of Month Number */}
              <span
                className={`text-sm sm:text-base font-extrabold font-mono leading-tight block ${
                  isSelected ? "text-slate-950" : "text-white"
                }`}
              >
                {day.dayOfMonth}
              </span>

              {/* "Today" tiny indicator dot */}
              {day.isToday && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    isSelected ? "bg-slate-950" : "bg-amber-400 animate-pulse"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
