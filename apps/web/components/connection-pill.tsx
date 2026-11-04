"use client";

import React from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export type ConnectionStatus = "connected" | "connecting" | "reconnecting" | "offline";

export interface ConnectionPillProps {
  isConnected?: boolean;
  status?: ConnectionStatus;
  reconnectAttempts?: number;
  className?: string;
  showIcon?: boolean;
}

export function ConnectionPill({
  isConnected = false,
  status,
  reconnectAttempts = 0,
  className = "",
  showIcon = true,
}: ConnectionPillProps) {
  // Determine effective status: explicit status prop takes precedence over raw boolean
  let effectiveStatus: ConnectionStatus = "offline";

  if (status) {
    effectiveStatus = status;
  } else if (isConnected) {
    effectiveStatus = "connected";
  } else if (reconnectAttempts > 0 && reconnectAttempts <= 5) {
    effectiveStatus = "reconnecting";
  } else {
    effectiveStatus = "offline";
  }

  if (effectiveStatus === "connected") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm backdrop-blur-sm transition-all duration-300 ${className}`}
        title="Connected to Live Queue Engine (0ms Latency)"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        {showIcon && <Wifi className="h-3 w-3 text-emerald-400" />}
        <span>Live Sync</span>
      </div>
    );
  }

  if (effectiveStatus === "connecting") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm backdrop-blur-sm transition-all duration-300 ${className}`}
        title="Connecting to Live Queue Engine..."
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
        </span>
        {showIcon && <Loader2 className="h-3 w-3 text-amber-300 animate-spin" />}
        <span>Connecting...</span>
      </div>
    );
  }

  if (effectiveStatus === "reconnecting") {
    const attemptText = reconnectAttempts > 0 ? ` (Attempt ${reconnectAttempts}/5)` : "";
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm backdrop-blur-sm animate-pulse transition-all duration-300 ${className}`}
        title={`Reconnecting to Live Engine${attemptText}...`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 shadow-sm backdrop-blur-sm transition-all duration-300 ${className}`}
      title="Operating in Offline Cache Mode (Showing cached data)"
    >
      <span className="inline-flex rounded-full h-2 w-2 bg-slate-500" />
      {showIcon && <WifiOff className="h-3 w-3 text-slate-400" />}
      <span>Offline Cache</span>
    </div>
  );
}
