"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Armchair,
  ExternalLink,
  Play,
  CheckCircle2,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Scissors,
  Check,
  Flame,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

export const QueueSimulator: React.FC<SectionProps> = ({ config }) => {
  const [currentServing, setCurrentServing] = useState(103);
  const [customerName, setCustomerName] = useState("Vikram");
  const [nextTicket, setNextTicket] = useState(104);
  const [nextName, setNextName] = useState("Amit Sharma");
  const [alertDispatched, setAlertDispatched] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentEvents, setRecentEvents] = useState<string[]>([
    "Chair #1: Ramesh Kumar started Haircut for Vikram (#103)",
    "Entrance QR: Amit Sharma (#104) joined live queue",
    "TV Mirror: Queue departure board synchronized in lobby",
  ]);

  // Client-side Web Audio API audio synthesis (Zero server streaming waste)
  const playAirportChime = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.45);

      // Note 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.18);
      gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.18);
      osc2.stop(ctx.currentTime + 0.75);
    } catch {
      // AudioContext policy
    }
  };

  const handleCallNext = () => {
    playAirportChime();
    setAlertDispatched(true);

    const prevNextTicket = nextTicket;
    const prevNextName = nextName;
    const pool = ["Pooja Rao", "Rohan Mehta", "Deepak Verma", "Karan Patel", "Sneha Joshi"];
    const upcomingName = pool[Math.floor(Math.random() * pool.length)];

    setCurrentServing(prevNextTicket);
    setCustomerName(prevNextName);
    setNextTicket((prev) => prev + 1);
    setNextName(upcomingName);

    // Prepend new activity
    setRecentEvents((prev) => [
      `⚡ Chair #1: Summoned ${prevNextName} (#${prevNextTicket}) · WhatsApp ping sent`,
      ...prev.slice(0, 2),
    ]);

    setTimeout(() => {
      setAlertDispatched(false);
    }, 4000);
  };

  const handleReset = () => {
    setCurrentServing(103);
    setCustomerName("Vikram");
    setNextTicket(104);
    setNextName("Amit Sharma");
    setAlertDispatched(false);
    setRecentEvents([
      "Simulation reset to initial state",
      "Chair #1: Ramesh Kumar ready",
      "Entrance QR: Ready for scan",
    ]);
  };

  return (
    <section id="simulator" className="py-24 bg-[#080d0a] border-y border-slate-800/80 relative overflow-hidden">
      {/* Warm Salon Studio Halos */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-amber-600/10 via-emerald-600/15 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3 px-3.5 py-1 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 shadow-lg shadow-amber-950/40"
          >
            💈 Live Stylist Sandbox · Web Audio Accelerated
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Test the Real-Time Salon Engine Live
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
            Click &ldquo;Call Next Customer&rdquo; below to simulate a barber tapping their chair tablet. Hear the synthesized chime and watch tickets and WhatsApp arrival alerts synchronize in real time.
          </p>
        </div>

        {/* Simulator Salon Station Card */}
        <div className="max-w-4xl mx-auto rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-slate-950 to-[#080d0a] border-2 border-slate-800 p-6 sm:p-9 shadow-2xl relative overflow-hidden">
          {/* Subtle Walnut Trim Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-emerald-500/40 to-teal-500/40" />

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between pb-6 mb-6 border-b border-slate-800/80 gap-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Barber Cutting Station Chair #1</span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                    Online &middot; PIN: 1234
                  </span>
                </h4>
                <p className="text-xs text-slate-300">Stylist: Ramesh Kumar (Senior Master Stylist)</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Sound Toggle */}
              <Button
                onClick={() => setSoundEnabled(!soundEnabled)}
                size="sm"
                variant="outline"
                className={`border-slate-800 text-xs h-11 px-3 ${
                  soundEnabled ? "text-amber-300 bg-slate-900" : "text-slate-500 bg-slate-950"
                }`}
                title={soundEnabled ? "Audio Chime Enabled" : "Audio Chime Muted"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>

              <Button
                onClick={handleCallNext}
                size="sm"
                className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold gap-2 text-xs h-11 px-5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform min-h-[44px]"
              >
                <Scissors className="h-4 w-4 text-amber-300" />
                Call Next Customer
              </Button>

              <Button
                onClick={handleReset}
                size="sm"
                variant="outline"
                className="border-slate-800 text-slate-400 hover:text-white text-xs h-11 px-3.5"
                title="Reset Simulation"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Dual Panel Simulation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Chair Status & Live Bill */}
            <div className="rounded-2xl bg-slate-950/90 border border-slate-800/90 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Armchair className="h-3.5 w-3.5 text-amber-400" />
                  Station Touch Panel
                </span>
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300 bg-amber-500/10">
                  Chair Seated
                </Badge>
              </div>

              <div>
                <p className="text-xs text-slate-400">Currently in Chair</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black text-white tracking-tight">#{currentServing}</span>
                  <span className="text-lg font-bold text-slate-200">{customerName}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Services in Progress:</span>
                <span className="text-slate-200 font-medium">Haircut + Beard Trim</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Live Bill Total:</span>
                <span className="text-emerald-400 font-bold text-sm font-mono">₹140 (Cash / UPI)</span>
              </div>
            </div>

            {/* Right: Next Customer Pocket Ticket & WhatsApp Alert */}
            <div className="rounded-2xl bg-slate-950/90 border border-slate-800/90 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  Next Customer Telemetry
                </span>
                {alertDispatched ? (
                  <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-300 animate-pulse border border-emerald-500/40">
                    ⚡ WhatsApp Alert Sent!
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                    Waiting Nearby
                  </Badge>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-400">Next Ticket in Queue</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black text-white tracking-tight">#{nextTicket}</span>
                  <span className="text-lg font-bold text-slate-200">{nextName}</span>
                </div>
              </div>

              {/* Dynamic Notification Bubble */}
              <div
                className={`p-3.5 rounded-xl border text-xs text-slate-300 space-y-1 transition-all ${
                  alertDispatched
                    ? "bg-[#075E54]/45 border-emerald-500/60 shadow-lg shadow-emerald-950/60"
                    : "bg-slate-900/80 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Automated WhatsApp Dispatch:</span>
                </div>
                <p className="text-[11px] text-slate-200 italic">
                  &ldquo;Namaste {nextName}! Your chair is ready with Ramesh Kumar. Please step in within 3 minutes! ✂️&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Real-Time Activity Feed Ticker */}
          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Salon Event Stream
              </span>
              <span className="text-[10px] font-mono text-slate-500">Bun WebSocket Dispatch</span>
            </div>
            <div className="space-y-1.5">
              {recentEvents.map((evt, idx) => (
                <div
                  key={idx}
                  className="text-xs font-mono text-slate-300 bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-800/80 flex items-center justify-between"
                >
                  <span className="truncate">{evt}</span>
                  <span className="text-[10px] text-emerald-400/80 shrink-0 ml-2">Just Now</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
