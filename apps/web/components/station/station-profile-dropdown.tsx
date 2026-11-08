"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Stylist } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { triggerHaptic, isHapticEnabled, setHapticEnabled } from "@/lib/haptics";
import {
  ChevronDown,
  User,
  Coffee,
  Moon,
  Maximize2,
  Minimize2,
  Tv,
  KeyRound,
  LogOut,
  IndianRupee,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Sliders,
  Columns,
  Layers,
} from "lucide-react";

interface StationProfileDropdownProps {
  slug: string;
  activeStylist: Stylist | null;
  userName?: string;
  dailyEarningsTotal?: number;
  dailyClientsCount?: number;
  isOnBreak?: boolean;
  breakRemainingSeconds?: number | null;
  isMirrorMode?: boolean;
  isFullscreen?: boolean;
  layoutMode?: "split" | "tabbed";
  onOpenEarnings?: () => void;
  onToggleBreak?: () => void;
  onToggleMirrorMode?: () => void;
  onToggleFullscreen?: () => void;
  onToggleLayoutMode?: () => void;
  onLockChair: () => void;
  onLogout?: () => void;
}

export function StationProfileDropdown({
  slug,
  activeStylist,
  userName,
  dailyEarningsTotal = 0,
  dailyClientsCount = 0,
  isOnBreak = false,
  breakRemainingSeconds = null,
  isMirrorMode = false,
  isFullscreen = false,
  layoutMode = "split",
  onOpenEarnings,
  onToggleBreak,
  onToggleMirrorMode,
  onToggleFullscreen,
  onToggleLayoutMode,
  onLockChair,
  onLogout,
}: StationProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hapticsOn, setHapticsOn] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize haptics state
  useEffect(() => {
    setHapticsOn(isHapticEnabled());
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleToggle = () => {
    triggerHaptic("tap");
    setIsOpen((prev) => !prev);
  };

  const handleToggleHapticPref = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !hapticsOn;
    setHapticsOn(next);
    setHapticEnabled(next);
    if (next) triggerHaptic("complete");
  };

  const displayName = userName || activeStylist?.name || "Staff Barber";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formatBreakTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Sandy's Top-Right Stylist Pill Trigger (Matches NBPCDL Reference Design) */}
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border transition-all duration-200 select-none ${
          isOpen
            ? "border-amber-400/80 bg-slate-800 text-white ring-2 ring-amber-400/20"
            : "border-slate-800 bg-slate-900/90 text-slate-200 hover:bg-slate-800 hover:border-slate-700"
        }`}
        title="Open Stylist Profile & Station Settings"
      >
        {/* Avatar Circle with Initials */}
        <div className="h-7 w-7 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
          {initials}
        </div>

        {/* Stylist Name */}
        <span className="text-xs font-bold truncate max-w-[110px] sm:max-w-[150px]">
          {displayName}
        </span>

        {/* Chevron Icon */}
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-amber-400" : ""
          }`}
        />
      </button>

      {/* Floating Flyout Menu (Dropdown Card) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-3">
          {/* 1. User Info Header */}
          <div className="p-2 space-y-1 border-b border-slate-800/80 pb-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm truncate">{displayName}</h4>
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] px-2 py-0.2 font-mono">
                BARBER CHAIR
              </Badge>
            </div>
            <p className="text-xs text-slate-400 truncate">
              {activeStylist?.name ? `${activeStylist.name} • Station active` : "Staff Account"}
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-400">Online & Ready</span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-slate-400">Pace: ~{activeStylist?.avgDurationMinutes || 25}m</span>
            </div>
          </div>

          {/* 2. Today's Performance & Shift Summary Card (NBPCDL Wallet Style) */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between gap-3 shadow-inner">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Shift Billing Today
              </p>
              <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                ₹{dailyEarningsTotal}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {dailyClientsCount} clients served
              </p>
            </div>

            {onOpenEarnings && (
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => {
                  triggerHaptic("tap");
                  setIsOpen(false);
                  onOpenEarnings();
                }}
                className="border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold h-8 px-3 rounded-lg gap-1.5 shrink-0"
              >
                <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Ledger</span>
              </Button>
            )}
          </div>

          {/* 3. Action Links & Controls */}
          <div className="space-y-1 text-xs">
            {/* Staff Portal Link */}
            <Link
              href="/staff"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <User className="h-4 w-4 text-purple-400 shrink-0" />
              <span className="font-medium">Staff Control Portal</span>
            </Link>

            {/* 10-Min Chai Break */}
            {onToggleBreak && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("tap");
                  onToggleBreak();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Coffee className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-medium">
                    {isOnBreak ? "Resume Work (End Break)" : "10-Minute Chai Break"}
                  </span>
                </div>
                {isOnBreak && (
                  <Badge className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0">
                    {formatBreakTime(breakRemainingSeconds || 0)}
                  </Badge>
                )}
              </button>
            )}

            {/* TV Mirror Board */}
            <Link
              href={`/s/${slug}/tv`}
              target="_blank"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Tv className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="font-medium">Launch Lounge TV Board</span>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-500" />
            </Link>

            {/* OLED Deep Black Mirror Mode */}
            {onToggleMirrorMode && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("tap");
                  onToggleMirrorMode();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Moon className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="font-medium">OLED Mirror Mode</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${
                    isMirrorMode
                      ? "border-purple-500 text-purple-300 bg-purple-500/20"
                      : "border-slate-700 text-slate-500"
                  }`}
                >
                  {isMirrorMode ? "ON" : "OFF"}
                </Badge>
              </button>
            )}

            {/* Fullscreen Mode */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("tap");
                  onToggleFullscreen();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <Maximize2 className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="font-medium">
                    {isFullscreen ? "Exit Fullscreen" : "Fullscreen Kiosk"}
                  </span>
                </div>
              </button>
            )}

            {/* Layout View Setting (Split / Tabbed) */}
            {onToggleLayoutMode && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("tap");
                  onToggleLayoutMode();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  {layoutMode === "split" ? (
                    <Columns className="h-4 w-4 text-amber-400 shrink-0" />
                  ) : (
                    <Layers className="h-4 w-4 text-amber-400 shrink-0" />
                  )}
                  <span className="font-medium">Layout View</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-300 bg-amber-500/10"
                >
                  {layoutMode === "split" ? "Split Screen" : "Tabbed"}
                </Badge>
              </button>
            )}

            {/* Android Haptic Tactile Feedback Toggle */}
            <button
              type="button"
              onClick={handleToggleHapticPref}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-medium">Haptic Vibration</span>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${
                  hapticsOn
                    ? "border-emerald-500 text-emerald-300 bg-emerald-500/20"
                    : "border-slate-700 text-slate-500"
                }`}
              >
                {hapticsOn ? "ON" : "OFF"}
              </Badge>
            </button>

            {/* Lock Chair Screen */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("tap");
                setIsOpen(false);
                onLockChair();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-left"
            >
              <KeyRound className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="font-medium">Lock Chair Station (PIN)</span>
            </button>
          </div>

          {/* 4. Bottom Sign Out */}
          {onLogout && (
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("tap");
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors text-xs font-semibold text-left"
              >
                <LogOut className="h-4 w-4 text-rose-400 shrink-0" />
                <span>Log Out / Switch Account</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
