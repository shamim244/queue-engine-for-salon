import React from "react";
import Link from "next/link";
import type { Stylist } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectionPill, type ConnectionStatus } from "@/components/connection-pill";
import { Armchair, Tv, KeyRound, Sparkles, LogOut, Coffee, Moon, Maximize2, Minimize2 } from "lucide-react";

interface StationChairHeaderProps {
  slug: string;
  activeStylist: Stylist | null;
  hasMultipleStylists: boolean;
  socketStatus?: ConnectionStatus;
  reconnectAttempts: number;
  userName?: string;
  isOnBreak?: boolean;
  breakRemainingSeconds?: number | null;
  isMirrorMode?: boolean;
  isFullscreen?: boolean;
  onToggleBreak?: () => void;
  onToggleMirrorMode?: () => void;
  onToggleFullscreen?: () => void;
  onOpenSwitchChair: () => void;
  onOpenQuickAdd: () => void;
  onLockChair: () => void;
  onLogout?: () => void;
}

export function StationChairHeader({
  slug,
  activeStylist,
  hasMultipleStylists,
  socketStatus,
  reconnectAttempts,
  userName,
  isOnBreak,
  breakRemainingSeconds,
  isMirrorMode,
  isFullscreen,
  onToggleBreak,
  onToggleMirrorMode,
  onToggleFullscreen,
  onOpenSwitchChair,
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
    <header className={`border-b border-slate-800 ${isMirrorMode ? "bg-black" : "bg-slate-900/90"} backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between transition-colors`}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 shadow-md">
          <Armchair className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">
              {activeStylist?.name || "Barber Station"}
            </span>
            <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800 text-slate-300">
              Pace: {activeStylist?.avgDurationMinutes || 25}m
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {isOnBreak ? (
              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                <Coffee className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                <span>Chai Break ({formatBreakTime(breakRemainingSeconds || 0)})</span>
              </span>
            ) : (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Station
              </span>
            )}
            {hasMultipleStylists && !isOnBreak && (
              <button
                type="button"
                onClick={onOpenSwitchChair}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium ml-1"
              >
                Change Chair
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        <ConnectionPill status={socketStatus} reconnectAttempts={reconnectAttempts} />

        {onToggleBreak && (
          <Button
            variant={isOnBreak ? "default" : "outline"}
            size="sm"
            onClick={onToggleBreak}
            className={`text-xs font-bold gap-1.5 h-9 rounded-xl transition-all ${
              isOnBreak
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/25"
                : "border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300"
            }`}
            title={isOnBreak ? "End break and resume chair immediately" : "Take a 10-minute chai or tool-cleaning break"}
          >
            <Coffee className="h-3.5 w-3.5 text-amber-400" />
            <span>{isOnBreak ? "Resume Work" : "☕ 10m Break"}</span>
          </Button>
        )}

        {/* Feature 4: High-Contrast OLED Mirror Mode Toggle */}
        {onToggleMirrorMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleMirrorMode}
            className={`text-xs font-bold gap-1.5 h-9 rounded-xl transition-all ${
              isMirrorMode
                ? "bg-purple-950/80 border-purple-400 text-purple-200 ring-1 ring-purple-400"
                : "border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300"
            }`}
            title="Toggle OLED Deep Black Mirror Mode (anti-glare reflection)"
          >
            <Moon className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden md:inline">{isMirrorMode ? "🪞 Mirror OLED" : "Mirror Mode"}</span>
          </Button>
        )}

        {/* Fullscreen Kiosk Mode Toggle */}
        {onToggleFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="h-9 w-9 text-slate-400 hover:text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Kiosk Mode"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenQuickAdd}
          className="hidden sm:flex border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs font-bold gap-1.5 h-9 rounded-xl"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>+ Walk-in</span>
        </Button>

        <Link href={`/s/${slug}/tv`} target="_blank">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white" title="Launch TV Board">
            <Tv className="h-4 w-4" />
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={onLockChair}
          className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs gap-1.5 h-9 rounded-xl"
          title="Lock mirror tablet screen (requires PIN or login to resume)"
        >
          <KeyRound className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Lock Chair</span>
        </Button>

        {onLogout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 text-xs gap-1.5 h-9 rounded-xl px-2.5"
            title="Sign out of staff station"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </Button>
        )}
      </div>
    </header>
  );
}
