import React, { useState } from "react";
import Link from "next/link";
import type { Stylist } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectionPill, type ConnectionStatus } from "@/components/connection-pill";
import {
  Armchair,
  Tv,
  KeyRound,
  Sparkles,
  LogOut,
  Coffee,
  Moon,
  Maximize2,
  Minimize2,
  Columns,
  Layers,
  Menu,
  X,
  User,
  Shield,
  ExternalLink,
  Check,
  IndianRupee,
} from "lucide-react";

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
  layoutMode?: "split" | "tabbed";
  dailyEarningsTotal?: number;
  dailyClientsCount?: number;
  onOpenEarnings?: () => void;
  onToggleBreak?: () => void;
  onToggleMirrorMode?: () => void;
  onToggleFullscreen?: () => void;
  onToggleLayoutMode?: () => void;
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
  layoutMode = "split",
  dailyEarningsTotal,
  dailyClientsCount,
  onOpenEarnings,
  onToggleBreak,
  onToggleMirrorMode,
  onToggleFullscreen,
  onToggleLayoutMode,
  onOpenSwitchChair,
  onOpenQuickAdd,
  onLockChair,
  onLogout,
}: StationChairHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const formatBreakTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const displayName = userName || activeStylist?.name || "Staff Barber";

  return (
    <>
      <header
        className={`border-b border-slate-800 ${
          isMirrorMode ? "bg-black" : "bg-slate-900/90"
        } backdrop-blur sticky top-0 z-40 px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between transition-colors`}
      >
        {/* Left: Chair Identity & Stylist */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 shadow-md shrink-0">
            <Armchair className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-white text-sm sm:text-base truncate">
                {activeStylist?.name || "Barber Station"}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] border-slate-700 bg-slate-800 text-slate-300 shrink-0"
              >
                Pace: {activeStylist?.avgDurationMinutes || 25}m
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {isOnBreak ? (
                <span className="text-[11px] sm:text-xs text-amber-400 font-semibold flex items-center gap-1.5 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                  <Coffee className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400 animate-pulse" />
                  <span>Break ({formatBreakTime(breakRemainingSeconds || 0)})</span>
                </span>
              ) : (
                <span className="text-[11px] sm:text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Active Station</span>
                </span>
              )}
              {hasMultipleStylists && !isOnBreak && (
                <button
                  type="button"
                  onClick={onOpenSwitchChair}
                  className="hidden sm:inline text-[11px] text-amber-400 hover:text-amber-300 underline font-medium ml-1"
                >
                  Change Chair
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Desktop Toolbar (Visible on tablet & desktop >= md) */}
        <div className="hidden md:flex items-center gap-2">
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
              title={
                isOnBreak
                  ? "End break and resume chair immediately"
                  : "Take a 10-minute chai or tool-cleaning break"
              }
            >
              <Coffee className="h-3.5 w-3.5 text-amber-400" />
              <span>{isOnBreak ? "Resume Work" : "☕ 10m Break"}</span>
            </Button>
          )}

          {/* OLED Mirror Mode */}
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
              title="Toggle OLED Deep Black Mirror Mode"
            >
              <Moon className="h-3.5 w-3.5 text-purple-400" />
              <span className="hidden lg:inline">{isMirrorMode ? "🪞 Mirror OLED" : "Mirror Mode"}</span>
            </Button>
          )}

          {/* Layout Mode Toggle */}
          {onToggleLayoutMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleLayoutMode}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold gap-1.5 h-9 rounded-xl transition-all"
              title={
                layoutMode === "split"
                  ? "Switch to Tabbed minimal scroll layout"
                  : "Switch to Side-by-Side split layout"
              }
            >
              {layoutMode === "tabbed" ? (
                <>
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden lg:inline">📑 Tabbed</span>
                </>
              ) : (
                <>
                  <Columns className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden lg:inline">🖥️ Split</span>
                </>
              )}
            </Button>
          )}

          {/* Fullscreen */}
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

          {/* Quick Add Walk-in */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenQuickAdd}
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs font-bold gap-1.5 h-9 rounded-xl"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>+ Walk-in</span>
          </Button>

          {/* Barber Daily Shift Earnings */}
          {onOpenEarnings && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenEarnings}
              className="border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold gap-1.5 h-9 rounded-xl transition-all shadow-sm"
              title="Open Daily Earnings & Shift Summary"
            >
              <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {dailyEarningsTotal !== undefined ? `₹${dailyEarningsTotal} Today` : "Earnings"}
              </span>
            </Button>
          )}

          {/* TV Board */}
          <Link href={`/s/${slug}/tv`} target="_blank">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 hover:text-white"
              title="Launch TV Board"
            >
              <Tv className="h-4 w-4" />
            </Button>
          </Link>

          {/* Lock Chair */}
          <Button
            variant="outline"
            size="sm"
            onClick={onLockChair}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs gap-1.5 h-9 rounded-xl"
            title="Lock mirror tablet screen"
          >
            <KeyRound className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden lg:inline">Lock Chair</span>
          </Button>

          {/* Sign Out */}
          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 text-xs gap-1.5 h-9 rounded-xl px-2.5"
              title="Sign out of staff station"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Sign Out</span>
            </Button>
          )}

          {/* Station Menu / Profile Drawer Trigger (Available on Desktop & Mobile) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileMenuOpen(true)}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold gap-1.5 h-9 rounded-xl transition-all shadow-sm"
            title="Open Station Menu & Profile Drawer"
          >
            <Menu className="h-4 w-4 text-amber-400" />
            <span>Menu</span>
          </Button>
        </div>

        {/* Right Mobile Clean Header (Eliminates horizontal overflow on Android) */}
        <div className="flex md:hidden items-center gap-1.5 sm:gap-2 shrink-0">
          <ConnectionPill status={socketStatus} reconnectAttempts={reconnectAttempts} />

          {onToggleBreak && (
            <button
              type="button"
              onClick={onToggleBreak}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center min-h-[40px] min-w-[40px] shrink-0 transition-all ${
                isOnBreak
                  ? "bg-amber-500 border-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/25"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }`}
              title={isOnBreak ? "Resume Work" : "10m Chai Break"}
            >
              <Coffee className="h-4 w-4 text-amber-400" />
            </button>
          )}

          {/* Three-line Menu Button with Text (Sandy's Hamburger Trigger - Unmissable on Android) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 flex items-center gap-1.5 font-bold text-xs min-h-[40px] shrink-0 transition-all active:scale-95 shadow-sm"
            title="Open Station Menu & Preferences"
          >
            <Menu className="h-4 w-4 text-amber-400" />
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* Sandy's Mobile Slide-Out Station Drawer / Profile Panel */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative z-50 w-full max-w-xs bg-slate-950 border-l border-slate-800 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-full duration-200">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <Menu className="h-4 w-4 text-amber-400" />
                  <span>Station Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Profile Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black flex items-center justify-center text-lg">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{displayName}</h4>
                    <p className="text-xs text-slate-400 truncate">
                      {activeStylist?.name || "Barber Station"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Speed Pace:</span>
                  <span className="font-bold text-amber-400">
                    ~{activeStylist?.avgDurationMinutes || 25} mins / service
                  </span>
                </div>

                {hasMultipleStylists && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSwitchChair();
                    }}
                    className="w-full text-xs text-amber-400 hover:text-amber-300 font-semibold py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center transition-colors"
                  >
                    🔄 Switch Active Chair
                  </button>
                )}
              </div>

              {/* Barber Daily Shift & Earnings Summary Card */}
              {onOpenEarnings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenEarnings();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 text-left hover:border-emerald-500/60 transition-all group shadow-sm active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black">
                        <IndianRupee className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs group-hover:text-emerald-300 transition-colors">
                          Daily Earnings & Tips
                        </h4>
                        <p className="text-[11px] text-emerald-400 font-semibold font-mono">
                          {dailyEarningsTotal !== undefined ? `₹${dailyEarningsTotal} Billing` : "View Report"}
                          {dailyClientsCount !== undefined ? ` • ${dailyClientsCount} Served` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                      Summary
                    </Badge>
                  </div>
                </button>
              )}

              {/* Layout Preference Setting (Sandy's Setting Location) */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  ⚙️ Layout View Setting
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (layoutMode !== "split" && onToggleLayoutMode) onToggleLayoutMode();
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      layoutMode === "split"
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/50"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Columns className="h-4 w-4 mb-1 text-amber-400" />
                      {layoutMode === "split" && <Check className="h-3.5 w-3.5 text-amber-300" />}
                    </div>
                    <span className="block font-bold">Side-by-Side</span>
                    <span className="text-[10px] text-slate-400 font-normal">Split Screen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (layoutMode !== "tabbed" && onToggleLayoutMode) onToggleLayoutMode();
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      layoutMode === "tabbed"
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/50"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Layers className="h-4 w-4 mb-1 text-amber-400" />
                      {layoutMode === "tabbed" && <Check className="h-3.5 w-3.5 text-amber-300" />}
                    </div>
                    <span className="block font-bold">Tabbed</span>
                    <span className="text-[10px] text-slate-400 font-normal">Minimal Scroll</span>
                  </button>
                </div>
              </div>

              {/* Station Quick Tools */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  🛠️ Station Quick Tools
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenQuickAdd();
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs font-bold text-amber-300 hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>+ Quick Add Walk-in Guest</span>
                </button>

                {onToggleMirrorMode && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMirrorMode();
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Moon className="h-4 w-4 text-purple-400" />
                      <span>OLED Anti-Glare Mode</span>
                    </div>
                    <span className="text-[10px] text-purple-300 font-mono">
                      {isMirrorMode ? "ON" : "OFF"}
                    </span>
                  </button>
                )}

                {onToggleFullscreen && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleFullscreen();
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      <span>Fullscreen Kiosk Mode</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isFullscreen ? "Active" : "Normal"}
                    </span>
                  </button>
                )}

                <Link
                  href={`/s/${slug}/tv`}
                  target="_blank"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 block"
                >
                  <Tv className="h-4 w-4 text-amber-400" />
                  <span>Open Lounge TV Board</span>
                </Link>
              </div>

              {/* Sandy's Switch to Admin / Staff Portal Option */}
              <div className="pt-2 border-t border-slate-800">
                <Link
                  href={`/s/${slug}/admin`}
                  className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between hover:bg-amber-500/20 transition-all block"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-400" />
                    <span>Go to Salon Admin Panel</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                </Link>
              </div>
            </div>

            {/* Bottom Screen Lock & Logout Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLockChair();
                }}
                className="w-full min-h-[44px] rounded-xl border-slate-700 bg-slate-900 text-slate-300 font-bold text-xs gap-2"
              >
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span>Lock Mirror Tablet (PIN)</span>
              </Button>

              {onLogout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full min-h-[44px] rounded-xl text-rose-400 hover:bg-rose-950/30 font-bold text-xs gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
