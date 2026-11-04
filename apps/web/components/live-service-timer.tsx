"use client";

import React, { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

export interface LiveTimerStats {
  elapsedSeconds: number;
  formattedElapsed: string;
  remainingSeconds: number;
  formattedRemaining: string;
  progressPercent: number;
  isOvertime: boolean;
  overtimeSeconds: number;
}

export function calculateLiveTimerStats(
  startedTime?: string | Date | number | null,
  estimatedDurationMinutes?: number,
  nowMs: number = Date.now()
): LiveTimerStats {
  if (!startedTime) {
    return {
      elapsedSeconds: 0,
      formattedElapsed: "00:00",
      remainingSeconds: 0,
      formattedRemaining: "00:00",
      progressPercent: 0,
      isOvertime: false,
      overtimeSeconds: 0,
    };
  }

  const startMs = typeof startedTime === "number"
    ? startedTime
    : new Date(startedTime).getTime();

  if (isNaN(startMs)) {
    return {
      elapsedSeconds: 0,
      formattedElapsed: "00:00",
      remainingSeconds: 0,
      formattedRemaining: "00:00",
      progressPercent: 0,
      isOvertime: false,
      overtimeSeconds: 0,
    };
  }

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const totalEstimatedSeconds = (estimatedDurationMinutes || 0) * 60;

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const formattedElapsed = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  let remainingSeconds = 0;
  let formattedRemaining = "00:00";
  let progressPercent = 0;
  let isOvertime = false;
  let overtimeSeconds = 0;

  if (totalEstimatedSeconds > 0) {
    if (elapsedSeconds >= totalEstimatedSeconds) {
      isOvertime = true;
      overtimeSeconds = elapsedSeconds - totalEstimatedSeconds;
      progressPercent = 100;
      remainingSeconds = 0;
      formattedRemaining = "00:00";
    } else {
      remainingSeconds = totalEstimatedSeconds - elapsedSeconds;
      const remMins = Math.floor(remainingSeconds / 60);
      const remSecs = remainingSeconds % 60;
      formattedRemaining = `${remMins.toString().padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`;
      progressPercent = Math.min(100, Math.round((elapsedSeconds / totalEstimatedSeconds) * 100));
    }
  }

  return {
    elapsedSeconds,
    formattedElapsed,
    remainingSeconds,
    formattedRemaining,
    progressPercent,
    isOvertime,
    overtimeSeconds,
  };
}

interface LiveServiceTimerProps {
  startedTime?: string | Date | number | null;
  estimatedDurationMinutes?: number;
  variant?: "station" | "customer" | "badge";
  className?: string;
}

export function LiveServiceTimer({
  startedTime,
  estimatedDurationMinutes = 20,
  variant = "station",
  className = "",
}: LiveServiceTimerProps) {
  const [stats, setStats] = useState<LiveTimerStats>(() =>
    calculateLiveTimerStats(startedTime, estimatedDurationMinutes)
  );

  useEffect(() => {
    // Initial immediate calculation
    setStats(calculateLiveTimerStats(startedTime, estimatedDurationMinutes));

    const update = () => {
      setStats(calculateLiveTimerStats(startedTime, estimatedDurationMinutes));
    };

    // Client RAM interval (1 second)
    const interval = setInterval(update, 1000);

    // Sync on window focus / visibility change
    const onVisibilityChange = () => {
      if (!document.hidden) {
        update();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [startedTime, estimatedDurationMinutes]);

  if (variant === "badge") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
          stats.isOvertime
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
            : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
        } ${className}`}
      >
        <Clock className={`h-3 w-3 ${stats.isOvertime ? "text-amber-400" : "text-emerald-400 animate-spin"}`} />
        <span>{stats.formattedElapsed}</span>
        {stats.isOvertime && <span className="text-[10px] text-amber-400 font-sans">(overtime)</span>}
      </span>
    );
  }

  if (variant === "customer") {
    return (
      <div className={`p-4 rounded-2xl border ${stats.isOvertime ? "bg-amber-950/20 border-amber-500/30" : "bg-emerald-950/20 border-emerald-500/30"} space-y-3 ${className}`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Clock className={`h-4 w-4 ${stats.isOvertime ? "text-amber-400" : "text-emerald-400 animate-spin"}`} />
            <span>Service in Progress</span>
          </div>
          <span className="font-mono text-xs font-bold text-slate-300">
            Elapsed: <span className="text-white font-black">{stats.formattedElapsed}</span>
          </span>
        </div>

        {/* Client Computed Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                stats.isOvertime
                  ? "bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse"
                  : "bg-gradient-to-r from-emerald-500 to-teal-400"
              }`}
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>Progress: {stats.progressPercent}%</span>
            <span>
              {stats.isOvertime
                ? `+${Math.floor(stats.overtimeSeconds / 60)}m overtime`
                : `${stats.formattedRemaining} remaining`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Variant: "station" (Staff mirror tablet / station view)
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {stats.isOvertime ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>Overtime (+{Math.floor(stats.overtimeSeconds / 60)}m)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>In Service ({stats.progressPercent}%)</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300 bg-slate-950/80 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
          <Clock className={`h-3.5 w-3.5 ${stats.isOvertime ? "text-amber-400" : "text-emerald-400 animate-spin"}`} />
          <span>Elapsed: {stats.formattedElapsed}</span>
        </div>
      </div>

      {/* Progress Bar computed directly in Client RAM */}
      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            stats.isOvertime
              ? "bg-gradient-to-r from-amber-500 to-rose-500"
              : "bg-gradient-to-r from-emerald-500 to-teal-400"
          }`}
          style={{ width: `${stats.progressPercent}%` }}
        />
      </div>
    </div>
  );
}
