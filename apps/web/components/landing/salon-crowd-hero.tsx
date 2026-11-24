"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  QrCode,
  Zap,
  Clock,
  ArrowRight,
  Sparkles,
  Scissors,
  CheckCircle2,
  Armchair,
  MessageSquare,
  Coffee,
  Check,
  Flame,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalonBackgroundPattern } from "./salon-vector-art";
import type { SectionProps } from "./types";

interface WalkInGuest {
  id: string;
  name: string;
  avatar: string;
  ticket: string;
  status: "in_chair" | "stepping_out" | "waiting_lounge" | "just_scanned";
  service: string;
  stylist?: string;
  waitText: string;
  actionPill: string;
  signalGlow: string;
}

export const SalonCrowdHero: React.FC<SectionProps> = ({ config }) => {
  const [activeGuestId, setActiveGuestId] = useState<string>("guest-2");
  const [rushModeActive, setRushModeActive] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Client-side Web Audio API audio synthesis (Zero server streaming waste)
  const playCrowdChime = (freq = 659.25) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // AudioContext policy
    }
  };

  const crowd: WalkInGuest[] = [
    {
      id: "guest-1",
      name: "Vikram",
      avatar: "👨🏽",
      ticket: "#103",
      status: "in_chair",
      service: "Classic Fade + Beard Sculpt",
      stylist: "Ramesh Kumar",
      waitText: "Chair #1 Active · Cutting Now",
      actionPill: "Seated in Chair #1",
      signalGlow: "border-emerald-500 bg-emerald-500/20 text-emerald-300",
    },
    {
      id: "guest-2",
      name: "Amit Sharma",
      avatar: "🧑🏻",
      ticket: "Ticket #104",
      status: "stepping_out",
      service: "Haircut + Charcoal Scrub",
      stylist: "Ramesh Kumar",
      waitText: "12m wait · 1 ahead",
      actionPill: "Stepping out for Chai",
      signalGlow: "border-amber-400 bg-amber-500/20 text-amber-300",
    },
    {
      id: "guest-3",
      name: "Deepak Verma",
      avatar: "🧔🏾",
      ticket: "#105",
      status: "waiting_lounge",
      service: "Beard Trim & Hot Towel",
      stylist: "Rahul V.",
      waitText: "22m wait · 2 ahead",
      actionPill: "Watching 4K Lounge TV",
      signalGlow: "border-teal-400 bg-teal-500/20 text-teal-300",
    },
    {
      id: "guest-4",
      name: "Rohan Mehta",
      avatar: "🧑🏽",
      ticket: "#106",
      status: "just_scanned",
      service: "Executive Haircut",
      stylist: "Suresh P.",
      waitText: "Just Scanned Door QR",
      actionPill: "Pocket Ticket Issued",
      signalGlow: "border-cyan-400 bg-cyan-500/20 text-cyan-300",
    },
    {
      id: "guest-5",
      name: "Pooja Rao",
      avatar: "👩🏻",
      ticket: "#107",
      status: "waiting_lounge",
      service: "Keratin Deep Hair Spa",
      stylist: "Master Stylist",
      waitText: "VIP Bay Reserved",
      actionPill: "WhatsApp Auto-Summon Ready",
      signalGlow: "border-purple-400 bg-purple-500/20 text-purple-300",
    },
  ];

  const activeGuest = crowd.find((g) => g.id === activeGuestId) || crowd[1];

  return (
    <section className="relative py-20 bg-[#070b09] border-b border-slate-800/80 overflow-hidden">
      {/* 1. Global Salon Vector Wallpaper */}
      <SalonBackgroundPattern opacity={0.12} className="absolute inset-0 z-0 pointer-events-none" />

      {/* 2. Ambient Studio Lighting Halos */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] bg-gradient-to-r from-emerald-600/15 via-amber-600/10 to-teal-600/15 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-semibold mb-3 shadow-lg shadow-amber-950/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>💈 Inspired by Modern 2026 Crowd Engines · Physical Salon Rush</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Live Weekend Walk-In Stream: From Sidewalk to Styling Chair
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
            Watch how a 15-person Saturday sidewalk rush converts into zero crowded benches. Walk-ins scan the entrance door QR, step out for chai, and get summoned automatically when their chair is ready.
          </p>
        </div>

        {/* 3. The Interactive Crowd Simulation Stage */}
        <div className="max-w-5xl mx-auto rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-slate-950 to-[#080d0a] border-2 border-slate-800 p-6 sm:p-9 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-emerald-500/50 to-teal-500/40" />

          {/* Crowd Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800/80 gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Saturday Peak Rush Hour (16:30 IST)</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                    Chair #1 Active · Ramesh Kumar
                  </Badge>
                </span>
                <p className="text-xs text-slate-400">Door QR Acrylic Stand · 100% Zero Reception Congestion</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="border-slate-800 text-xs h-9 px-3 text-slate-300 hover:text-white"
                title={soundEnabled ? "Audio On" : "Audio Muted"}
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-amber-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
              </Button>
              <Badge variant="default" className="text-xs bg-slate-800/90 text-amber-300 border border-amber-500/30">
                100% Walk-Out Retention
              </Badge>
            </div>
          </div>

          {/* Horizontal Walk-In Crowd Avatar Track (Interactive Avatars) */}
          <div className="relative py-4 mb-6">
            <div className="flex items-center justify-between gap-3 overflow-x-auto pb-3 no-scrollbar">
              {crowd.map((guest) => {
                const isSelected = guest.id === activeGuestId;
                return (
                  <button
                    key={guest.id}
                    type="button"
                    onClick={() => {
                      setActiveGuestId(guest.id);
                      playCrowdChime(isSelected ? 783.99 : 659.25);
                    }}
                    className={`relative p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300 text-left min-w-[170px] sm:min-w-[190px] shrink-0 group ${
                      isSelected
                        ? "border-emerald-400 bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 shadow-xl shadow-emerald-950/80 scale-105"
                        : "border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900/80"
                    }`}
                  >
                    {/* Status Signal Ring */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl filter drop-shadow-md">{guest.avatar}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${guest.signalGlow}`}
                      >
                        {guest.ticket}
                      </span>
                    </div>

                    <div className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300 transition-colors">
                      {guest.name}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{guest.service}</p>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">{guest.actionPill}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Crowd Inspection Detail Card (Focus on Amit Sharma / Active Guest) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Left Column: Customer Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{activeGuest.avatar}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>{activeGuest.name}</span>
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300 font-mono">
                        {activeGuest.ticket}
                      </Badge>
                    </h3>
                    <p className="text-xs text-slate-400">{activeGuest.service}</p>
                  </div>
                </div>

                <div className="pt-2 text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Allocated Stylist:</span>
                    <span className="text-white font-semibold">{activeGuest.stylist || "Next Available"}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Current Action:</span>
                    <span className="text-emerald-400 font-semibold">{activeGuest.actionPill}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Queue Status:</span>
                    <span className="text-amber-300 font-semibold">{activeGuest.waitText}</span>
                  </div>
                </div>
              </div>

              {/* Middle Column: Visual Queue Telemetry Arc */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-300 font-bold">
                  <Coffee className="h-4 w-4 text-amber-400 animate-bounce" />
                  <span>The "Chai Break" Walk-Out Buffer</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Instead of staring at a full salon and leaving for the next shop, <strong>{activeGuest.name}</strong> walks to the nearby cafe. When Vikram's haircut in Chair #1 finishes, a WhatsApp summon ping automatically brings Amit straight to the chair.
                </p>
                <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Zero Waiting Room Clutter Guaranteed</span>
                </div>
              </div>

              {/* Right Column: Salon Owner Sales ROI */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold">Salon Owner Profit Impact</span>
                  <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-300">
                    Zero Walkouts
                  </Badge>
                </div>
                <div className="text-2xl font-black text-white font-mono">+₹250</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Average walk-in combo ticket saved. 12 walk-outs avoided each weekend equals <strong>+₹24,000 extra monthly revenue</strong> directly in your pocket.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
