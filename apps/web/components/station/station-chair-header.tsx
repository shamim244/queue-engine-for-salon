import React from "react";
import type { Stylist } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { ConnectionStatus } from "@/components/connection-pill";
import { Armchair, Coffee, Sparkles } from "lucide-react";
import { StationProfileDropdown } from "./station-profile-dropdown";

interface StationChairHeaderProps {
  slug: string;
  activeStylist: Stylist | null;
  hasMultipleStylists?: boolean;
  socketStatus?: ConnectionStatus;
  reconnectAttempts?: number;
  userName?: string;
  isOnBreak?: boolean;
  breakRemainingSeconds?: number | null;
  isMirrorMode?: boolean;
  isFullscreen?: boolean;
  layoutMode?: "split" | "tabbed";
  dailyEarningsTotal?: number;
  dailyClientsCount?: number;
  onOpenEarnings?: () => void;
  onToggleBreak?: () => void;
  onToggleMirrorMode?: () => void;
  onToggleFullscreen?: () => void;
  onToggleLayoutMode?: () => void;
  onOpenSwitchChair?: () => void;
  onOpenQuickAdd: () => void;
  onLockChair: () => void;
  onLogout?: () => void;
}

export function StationChairHeader({
  slug,
  activeStylist,
  socketStatus,
  userName,
  isOnBreak,
  breakRemainingSeconds,
  isMirrorMode,
  isFullscreen,
  layoutMode = "split",
  dailyEarningsTotal,
  dailyClientsCount,
  onOpenEarnings,
  onToggleBreak,
  onToggleMirrorMode,
  onToggleFullscreen,
  onToggleLayoutMode,
  onOpenQuickAdd,
  onLockChair,
  onLogout,
}: StationChairHeaderProps) {
  const formatBreakTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <header
      className={`border-b border-slate-800 ${
        isMirrorMode ? "bg-black" : "bg-slate-900/95"
      } backdrop-blur sticky top-0 z-40 px-3 sm:px-6 py-2.5 flex items-center justify-between transition-colors`}
    >
      {/* Left: Streamlined Chair Identity (Clean, compact, no oversized badges or text) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 shadow-md shrink-0">
          <Armchair className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-white text-sm sm:text-base truncate">
            {activeStylist?.name || "Barber Station"}
          </span>
          {isOnBreak ? (
            <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
              <Coffee className="h-3 w-3 text-amber-400 animate-pulse" />
              <span>Break ({formatBreakTime(breakRemainingSeconds || 0)})</span>
            </span>
          ) : (
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                socketStatus === "connected"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
              title={socketStatus === "connected" ? "Live connected" : "Connecting..."}
            >
              <span className="relative flex h-1.5 w-1.5">
                {socketStatus === "connected" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    socketStatus === "connected" ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                />
              </span>
              <span>Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Action (+ Walk-in) + Sandy's Compact Profile Dropdown Pill */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenQuickAdd}
          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs font-bold gap-1.5 h-8 px-2.5 sm:px-3 rounded-xl shadow-sm"
          title="Quickly add a walk-in client"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden xs:inline sm:inline">+ Walk-in</span>
          <span className="xs:hidden sm:hidden">+ Add</span>
        </Button>

        {/* Sandy's Top-Right Profile Pill Dropdown (Matches NBPCDL Reference Design) */}
        <StationProfileDropdown
          slug={slug}
          activeStylist={activeStylist}
          userName={userName}
          dailyEarningsTotal={dailyEarningsTotal}
          dailyClientsCount={dailyClientsCount}
          isOnBreak={isOnBreak}
          breakRemainingSeconds={breakRemainingSeconds}
          isMirrorMode={isMirrorMode}
          isFullscreen={isFullscreen}
          layoutMode={layoutMode}
          onOpenEarnings={onOpenEarnings}
          onToggleBreak={onToggleBreak}
          onToggleMirrorMode={onToggleMirrorMode}
          onToggleFullscreen={onToggleFullscreen}
          onToggleLayoutMode={onToggleLayoutMode}
          onLockChair={onLockChair}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
