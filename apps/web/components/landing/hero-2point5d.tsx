"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  Sparkles,
  MessageSquare,
  ExternalLink,
  Tv,
  CheckCircle2,
  Clock,
  QrCode,
  Smartphone,
  Scissors,
  Flame,
  Check,
  Zap,
  Volume2,
  RotateCcw,
  TrendingUp,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import {
  SalonBackgroundPattern,
  SalonStationIsometricIllustration,
  BarberChairVector,
  ScissorsShearsVector,
  StraightRazorVector,
  BarberPoleVector,
} from "./salon-vector-art";
import type { SectionProps } from "./types";

export type HotspotId = "tablet" | "chair" | "ticket" | "whatsapp" | "tools";

export const Hero2Point5D: React.FC<SectionProps> = ({ config }) => {
  // Client-side ticking countdown for the ticket preview (Zero server waste)
  const [countdownSeconds, setCountdownSeconds] = useState(745); // 12m 25s
  const [activeStationTab, setActiveStationTab] = useState<"photo" | "blueprint">("photo");
  const [activeHotspot, setActiveHotspot] = useState<HotspotId>("tablet");
  const [simulatedCalled, setSimulatedCalled] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(103);
  const [currentGuest, setCurrentGuest] = useState("Vikram");
  const [nextTicket, setNextTicket] = useState(104);
  const [nextGuest, setNextGuest] = useState("Amit Sharma");
  const [liveBill, setLiveBill] = useState(140);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 1 ? prev - 1 : 720));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  // Client-side Web Audio API dual-tone chime (Zero server streaming waste)
  const playStationChime = () => {
    if (typeof window === "undefined") return;
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
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);

      // Note 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.16);
      osc2.stop(ctx.currentTime + 0.65);
    } catch {
      // AudioContext policy
    }
  };

  // Interactive 1-tap call next simulation directly on station
  const handleSimulateCallNext = () => {
    playStationChime();
    setSimulatedCalled(true);
    setCurrentTicket(104);
    setCurrentGuest("Amit Sharma");
    setLiveBill(250); // Haircut + Beard Combo

    setTimeout(() => {
      setSimulatedCalled(false);
    }, 4500);
  };

  const handleResetSimulation = () => {
    setCurrentTicket(103);
    setCurrentGuest("Vikram");
    setNextTicket(104);
    setNextGuest("Amit Sharma");
    setLiveBill(140);
    setSimulatedCalled(false);
  };

  // Salon Owner Psychology Hotspots Map
  const hotspotsData: Record<
    HotspotId,
    {
      title: string;
      badge: string;
      headline: string;
      psychology: string;
      roiHighlight: string;
      position: { top: string; left: string };
    }
  > = {
    tablet: {
      title: "Stylist Mirror Touchpad",
      badge: "Chair #1 Mirror Mount · PIN: 1234",
      headline: "Zero Wash-Hand Friction · 1-Tap Customer Summon",
      psychology:
        "Barbers hate messy keyboards or washing wet shampooed hands to write in notebooks. Stylist Ramesh Kumar taps PIN: 1234 on the mirror tablet with 1 wet thumb: next customer summoned, service timer starts, and ₹140 bill auto-calculated.",
      roiHighlight: "⚡ 0.4s Chair Turnover · Eliminates 10 mins wasted between clients",
      position: { top: "33%", left: "27%" },
    },
    chair: {
      title: "Hydraulic Styling Bay #1",
      badge: "Emerald Vintage Hydraulic Station",
      headline: "Stop Chair Idle Time · Maximize Revenue Per Minute",
      psychology:
        "Your hydraulic chair is your salon's primary revenue engine. An empty chair during rush hour costs you ₹400/hr in wasted rent, air conditioning, and idle barber salaries. Real-time auto-queuing keeps every chair continuously filled with zero gap.",
      roiHighlight: "💰 +32% Chair Utilization · Adds ₹18,500+ monthly salon profit",
      position: { top: "58%", left: "50%" },
    },
    ticket: {
      title: "Paper Token Stub (#104)",
      badge: "Physical Stub + Digital Live Pocket Ticket",
      headline: "Customers Step Out For Chai · Zero Lost Walk-Outs",
      psychology:
        "When Saturday rush fills your chairs, walk-in clients peek inside, see a 45-minute wait, and leave for your competitor. With Ticket #104, Amit steps out for cutting chai or errands while tracking his live countdown on his phone.",
      roiHighlight: "🎯 98.4% Walk-In Retention · Recovers 8 to 14 lost clients every weekend",
      position: { top: "68%", left: "70%" },
    },
    whatsapp: {
      title: "WhatsApp Summon Pill",
      badge: "Automated Meta Cloud Dispatch",
      headline: "Zero Awkward Yelling · Polite 3-Minute Arrival Window",
      psychology:
        "No loud barber shouting 'Next! Who was next?' or customers arguing at the desk. Amit receives an automated WhatsApp alert: 'Namaste Amit! Your chair is ready with Ramesh Kumar. Please step in within 3 minutes! ✂️'.",
      roiHighlight: "📱 99.8% Open Rate · 100% Dignified, Luxury Salon Experience",
      position: { top: "22%", left: "73%" },
    },
    tools: {
      title: "Sanitized Shelf & Barber Shears",
      badge: "Zero Reception Hardware Clutter",
      headline: "No Bulky Computers · 100% Clean Styling Granite",
      psychology:
        "Zero bulky desktop towers, zero receipt printers, zero tangled cables at your styling mirror. The entire Queue Engine runs on your barbers' wall mirror screens and customer phones.",
      roiHighlight: "💈 100% Uncluttered Salon Aesthetic · Low Hardware Investment",
      position: { top: "74%", left: "20%" },
    },
  };

  const activeData = hotspotsData[activeHotspot];

  return (
    <section className="relative overflow-hidden bg-[#080c0a] pt-6 pb-20">
      {/* 1. Global Illustrated Salon Vector Wallpaper Pattern (Never Just a Solid Color) */}
      <SalonBackgroundPattern opacity={0.16} className="absolute inset-0 z-0 pointer-events-none" />

      {/* 2. Warm Salon Studio Lighting Halos (Tungsten Amber & Emerald) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-amber-600/15 via-emerald-600/10 to-transparent blur-[160px] pointer-events-none rounded-full z-0" />
      <div className="absolute top-1/4 left-5 w-[450px] h-[450px] bg-amber-600/10 blur-[140px] pointer-events-none rounded-full z-0" />
      <div className="absolute top-1/3 right-5 w-[450px] h-[450px] bg-emerald-700/10 blur-[140px] pointer-events-none rounded-full z-0" />

      {/* 3. Illustrated Salon Vector Watermarks in Background */}
      <div className="hidden xl:block absolute left-4 top-1/3 -translate-y-1/2 z-0 opacity-20 pointer-events-none transition-transform hover:scale-105">
        <BarberChairVector size={260} className="text-emerald-400" />
      </div>
      <div className="hidden xl:block absolute right-4 top-1/4 z-0 opacity-20 pointer-events-none">
        <ScissorsShearsVector size={230} className="text-amber-400 transform -rotate-12" />
      </div>
      <div className="hidden 2xl:block absolute right-16 bottom-20 z-0 opacity-15 pointer-events-none">
        <StraightRazorVector size={210} className="text-amber-500" />
      </div>

      {/* Subtle Classic Barber Pole Spiral Accent on Left Side */}
      <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 z-10">
        <BarberPoleVector size={64} className="text-amber-400 drop-shadow-xl animate-pulse" />
      </div>

      {/* 4. Aceternity ContainerScroll: 25° 3D Perspective Scroll Unfolding */}
      <div className="relative z-10">
        <ContainerScroll
          titleComponent={
            <div className="text-center max-w-5xl mx-auto px-4">
              {/* Salon Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/95 border border-amber-500/40 text-amber-300 text-xs font-semibold mb-6 shadow-xl shadow-amber-950/40 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span>💈 The Real-Time Engine for High-Volume Indian Salons</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300">Ramesh Barber Tested</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12] max-w-4xl mx-auto">
                {config.heroHeadline || "The Real-Time Engine for High-Volume Indian Salons"}
              </h1>

              {/* Subtitle */}
              <p className="mt-5 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                {config.heroSubheadline}
              </p>

              {/* Hero Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-xl shadow-emerald-600/30 gap-2 h-12 px-7 text-sm min-h-[48px]"
                  >
                    {config.heroCtaText}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <Link href="/s/ramesh-barber/station" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-amber-500/40 bg-slate-900/90 hover:bg-slate-800 text-amber-200 font-semibold gap-2 h-12 px-6 text-sm min-h-[48px] shadow-lg shadow-black/40"
                  >
                    <Scissors className="h-4 w-4 text-amber-400" />
                    Launch Barber Cutting Station
                  </Button>
                </Link>

                <Link href="/s/aura-salon/tv" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="w-full text-slate-300 hover:text-white gap-2 h-12 px-5 text-sm min-h-[48px]"
                  >
                    <Tv className="h-4 w-4 text-teal-400" />
                    <span>Preview Lounge TV Mirror &rarr;</span>
                  </Button>
                </Link>
              </div>

              {/* Real Salon Social Proof Highlights */}
              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-slate-800/80 text-left">
                <div className="p-2 sm:p-3">
                  <p className="text-2xl sm:text-3xl font-black text-white">500+</p>
                  <p className="text-xs text-amber-300/80 mt-0.5 font-medium">Active Barber Chairs</p>
                </div>
                <div className="p-2 sm:p-3">
                  <p className="text-2xl sm:text-3xl font-black text-emerald-400">&lt; 15 ms</p>
                  <p className="text-xs text-slate-400 mt-0.5">Bun WebSocket Chair Sync</p>
                </div>
                <div className="p-2 sm:p-3">
                  <p className="text-2xl sm:text-3xl font-black text-amber-400">0 App</p>
                  <p className="text-xs text-slate-400 mt-0.5">Guest Scans Door QR</p>
                </div>
                <div className="p-2 sm:p-3">
                  <p className="text-2xl sm:text-3xl font-black text-teal-400">+₹18,500</p>
                  <p className="text-xs text-slate-400 mt-0.5">Avg. Monthly Cash Saved</p>
                </div>
              </div>
            </div>
          }
        >
          {/* Unfolding Content: The Bespoke Barber Styling Mirror Centerpiece */}
          <div className="relative rounded-[2.5rem] bg-gradient-to-b from-slate-900 via-slate-950 to-[#0a0f0d] border-4 border-slate-700/80 p-4 sm:p-7 shadow-2xl backdrop-blur-2xl text-left overflow-hidden">
            {/* Authentic High-Resolution Salon Interior Scrim */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none bg-cover bg-center mix-blend-luminosity"
              style={{
                backgroundImage: "url('/landing/hero_salon_station_2_5d.jpg')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f0d] via-slate-950/90 to-slate-900/80 pointer-events-none" />

            {/* Mirror Top Brass & Walnut Header Bar */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Ramesh Traditional Barber</span>
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300 bg-amber-500/10">
                    Chair #1 Cutting Bay
                  </Badge>
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Stylist: Ramesh Kumar (Senior Master)
                </span>
                <span>·</span>
                <span className="bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 text-amber-300 font-semibold">
                  PIN: 1234
                </span>
              </div>
            </div>

            {/* 5. Bespoke 2.5D Realistic Salon Bay & Architectural Blueprint */}
            <div className="relative z-10 mb-6 bg-slate-950/80 rounded-2xl border border-slate-800/90 overflow-hidden shadow-2xl">
              <div className="flex flex-wrap items-center justify-between px-3.5 py-2.5 border-b border-slate-800/70 bg-slate-900/80 text-xs gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5" />
                    2.5D Architectural Salon Station Diagram
                  </span>
                  <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono">
                    (Tap or Hover Any Equipment to Reveal Salon Psychology)
                  </span>
                </div>

                {/* View Switcher: 2.5D Diorama Photo vs Vector Blueprint */}
                <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveStationTab("photo")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      activeStationTab === "photo"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    📸 2.5D Interactive Station
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStationTab("blueprint")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      activeStationTab === "blueprint"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    📐 Vector Architecture
                  </button>
                </div>
              </div>

              {/* Station Visual Showcase */}
              {activeStationTab === "photo" ? (
                <div className="relative">
                  {/* The 2.5D Cutaway Diorama with Anchored Spatial Hotspots */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden select-none bg-slate-950">
                    <img
                      src="/landing/hero_salon_station_2_5d.jpg"
                      alt="2.5D Cutaway Salon Cutting Station with Vintage Leather Chair and Mirror Tablet"
                      className="w-full h-full object-cover transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20 pointer-events-none" />

                    {/* SPATIAL HOTSPOT 1: Stylist Mirror Touchpad (Left Mirror) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHotspot("tablet");
                        playStationChime();
                      }}
                      onMouseEnter={() => setActiveHotspot("tablet")}
                      style={{ top: hotspotsData.tablet.position.top, left: hotspotsData.tablet.position.left }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group focus:outline-none transition-transform duration-300 ${
                        activeHotspot === "tablet" ? "scale-110" : "hover:scale-105"
                      }`}
                      title="Inspect Mirror Tablet"
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-8 h-8 rounded-full bg-cyan-400/30 animate-ping" />
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                          activeHotspot === "tablet"
                            ? "bg-cyan-500 border-white text-slate-950 scale-110 shadow-cyan-400/80"
                            : "bg-slate-950/90 border-cyan-400 text-cyan-300 shadow-black"
                        }`}>
                          <Smartphone className="w-3 h-3" />
                        </span>
                        <span className="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-950/90 border border-cyan-400/60 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-200 font-bold shadow-xl backdrop-blur-md">
                          📱 Mirror Tablet (PIN: 1234)
                        </span>
                      </div>
                    </button>

                    {/* SPATIAL HOTSPOT 2: Barber Hydraulic Chair (Center) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHotspot("chair");
                        playStationChime();
                      }}
                      onMouseEnter={() => setActiveHotspot("chair")}
                      style={{ top: hotspotsData.chair.position.top, left: hotspotsData.chair.position.left }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group focus:outline-none transition-transform duration-300 ${
                        activeHotspot === "chair" ? "scale-110" : "hover:scale-105"
                      }`}
                      title="Inspect Barber Chair"
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-10 h-10 rounded-full bg-emerald-400/30 animate-ping" />
                        <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                          activeHotspot === "chair"
                            ? "bg-emerald-500 border-white text-slate-950 scale-110 shadow-emerald-400/80"
                            : "bg-slate-950/90 border-emerald-400 text-emerald-300 shadow-black"
                        }`}>
                          <Armchair className="w-3.5 h-3.5" />
                        </span>
                        <span className="absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-950/90 border border-emerald-400/60 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-200 font-bold shadow-xl backdrop-blur-md">
                          💺 Chair #1 ({currentGuest})
                        </span>
                      </div>
                    </button>

                    {/* SPATIAL HOTSPOT 3: Paper Token Stub (Counter Right) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHotspot("ticket");
                        playStationChime();
                      }}
                      onMouseEnter={() => setActiveHotspot("ticket")}
                      style={{ top: hotspotsData.ticket.position.top, left: hotspotsData.ticket.position.left }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group focus:outline-none transition-transform duration-300 ${
                        activeHotspot === "ticket" ? "scale-110" : "hover:scale-105"
                      }`}
                      title="Inspect Paper Ticket"
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-8 h-8 rounded-full bg-amber-400/30 animate-ping" />
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                          activeHotspot === "ticket"
                            ? "bg-amber-500 border-white text-slate-950 scale-110 shadow-amber-400/80"
                            : "bg-slate-950/90 border-amber-400 text-amber-300 shadow-black"
                        }`}>
                          <Clock className="w-3 h-3" />
                        </span>
                        <span className="absolute right-7 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-950/90 border border-amber-400/60 px-2 py-0.5 rounded text-[10px] font-mono text-amber-200 font-bold shadow-xl backdrop-blur-md">
                          🎟️ Ticket #{nextTicket}
                        </span>
                      </div>
                    </button>

                    {/* SPATIAL HOTSPOT 4: WhatsApp Summon Alert (Floating Upper Right) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHotspot("whatsapp");
                        playStationChime();
                      }}
                      onMouseEnter={() => setActiveHotspot("whatsapp")}
                      style={{ top: hotspotsData.whatsapp.position.top, left: hotspotsData.whatsapp.position.left }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group focus:outline-none transition-transform duration-300 ${
                        activeHotspot === "whatsapp" ? "scale-110" : "hover:scale-105"
                      }`}
                      title="Inspect WhatsApp Dispatch"
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-8 h-8 rounded-full bg-[#25D366]/30 animate-ping" />
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                          activeHotspot === "whatsapp"
                            ? "bg-[#25D366] border-white text-slate-950 scale-110 shadow-emerald-400/80"
                            : "bg-slate-950/90 border-[#25D366] text-emerald-300 shadow-black"
                        }`}>
                          <MessageSquare className="w-3 h-3" />
                        </span>
                        <span className="absolute right-7 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-950/90 border border-emerald-400/60 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-200 font-bold shadow-xl backdrop-blur-md">
                          💬 Auto-WhatsApp Ping
                        </span>
                      </div>
                    </button>

                    {/* SPATIAL HOTSPOT 5: Tool Sanitizer & Shears (Counter Left) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHotspot("tools");
                        playStationChime();
                      }}
                      onMouseEnter={() => setActiveHotspot("tools")}
                      style={{ top: hotspotsData.tools.position.top, left: hotspotsData.tools.position.left }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group focus:outline-none transition-transform duration-300 ${
                        activeHotspot === "tools" ? "scale-110" : "hover:scale-105"
                      }`}
                      title="Inspect Clean Counter"
                    >
                      <div className="relative flex items-center justify-center">
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                          activeHotspot === "tools"
                            ? "bg-slate-300 border-white text-slate-950 scale-110 shadow-white/80"
                            : "bg-slate-950/90 border-slate-400 text-slate-300 shadow-black"
                        }`}>
                          <Scissors className="w-3 h-3" />
                        </span>
                        <span className="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-950/90 border border-slate-600 px-2 py-0.5 rounded text-[10px] font-mono text-slate-200 font-semibold shadow-xl backdrop-blur-md">
                          ✂️ Zero PC Clutter
                        </span>
                      </div>
                    </button>

                    {/* Dynamic Interactive Call Next Action Overlay Pill */}
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-auto">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={handleSimulateCallNext}
                          size="sm"
                          className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold gap-2 text-xs h-9 px-4 shadow-xl shadow-emerald-950/80 active:scale-95 transition-transform"
                        >
                          <Scissors className="h-3.5 w-3.5 text-amber-300" />
                          <span>Simulate 1-Tap Barber Call Next</span>
                        </Button>
                        {simulatedCalled && (
                          <Button
                            type="button"
                            onClick={handleResetSimulation}
                            size="sm"
                            variant="outline"
                            className="border-slate-700 bg-slate-950/80 text-slate-300 text-xs h-9 px-2.5"
                            title="Reset"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 text-xs font-mono text-emerald-300 shadow-xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Live Bill: #{currentTicket} {currentGuest} · ₹{liveBill}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Quick-Thumb Switcher (Generous >=48px Touch Targets) */}
                  <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-mono text-slate-400 uppercase font-bold shrink-0 hidden sm:inline">
                      Quick Focus:
                    </span>
                    {(
                      [
                        { id: "tablet", label: "📱 Mirror Tablet", color: "cyan" },
                        { id: "chair", label: "💺 Chair #1", color: "emerald" },
                        { id: "ticket", label: "🎟️ Ticket #104", color: "amber" },
                        { id: "whatsapp", label: "💬 WhatsApp", color: "emerald" },
                        { id: "tools", label: "✂️ Station Tools", color: "slate" },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveHotspot(item.id);
                          playStationChime();
                        }}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                          activeHotspot === item.id
                            ? "bg-slate-800 text-white border-2 border-amber-400 shadow-md"
                            : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Active Equipment Psychological Selling Breakdown Card */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 font-mono"
                        >
                          {activeData.badge}
                        </Badge>
                        <h4 className="text-sm font-bold text-white">{activeData.headline}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800/80 self-start sm:self-auto">
                        {activeData.roiHighlight}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {activeData.psychology}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2 sm:p-4">
                  <SalonStationIsometricIllustration activeTicket="#103" liveBill="₹140" />
                </div>
              )}
            </div>

            {/* 6. 4-Layer Tactile 3D Card Architecture (Granite/Leather Base + Ticket + Tools + WhatsApp Summon) */}
            <CardContainer className="w-full" containerClassName="py-1">
              <CardBody className="relative w-full">
                {/* Layer 0: Polished Salon Station Dark Granite / Emerald Leather Base */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                  {/* Layer 1 (translateZ 30px): Physical Pocket Ticket #104 with Serrated Tear Notches & Barcode */}
                  <CardItem
                    translateZ={30}
                    className={`rounded-2xl border-2 transition-all p-5 flex flex-col justify-between space-y-4 shadow-2xl relative overflow-hidden group cursor-pointer ${
                      activeHotspot === "ticket"
                        ? "border-amber-400 bg-gradient-to-b from-amber-950/60 via-slate-900/95 to-[#0d120f] ring-2 ring-amber-400/30"
                        : "border-amber-500/50 bg-gradient-to-b from-amber-950/40 via-slate-900/95 to-[#0d120f]"
                    }`}
                    onClick={() => {
                      setActiveHotspot("ticket");
                      playStationChime();
                    }}
                  >
                    {/* Physical Ticket Serrated Side Notches */}
                    <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#080c0a] border-r-2 border-amber-500/50" />
                    <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#080c0a] border-l-2 border-amber-500/50" />

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5" />
                          Paper Token Stub
                        </span>
                        <Badge variant="default" className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                          Step Out for Tea
                        </Badge>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between">
                        <div>
                          <div className="text-4xl font-black text-white tracking-tight">#{nextTicket}</div>
                          <div className="text-xs font-semibold text-slate-200 mt-0.5">{nextGuest}</div>
                        </div>
                        {/* Realistic Barcode */}
                        <div className="text-right">
                          <div className="font-mono text-[9px] text-slate-500">SQ-104-RMSH</div>
                          <div className="flex gap-0.5 mt-1 justify-end h-6 items-end">
                            <div className="w-1 h-5 bg-slate-300" />
                            <div className="w-0.5 h-6 bg-slate-100" />
                            <div className="w-1.5 h-4 bg-slate-300" />
                            <div className="w-0.5 h-6 bg-white" />
                            <div className="w-1 h-5 bg-slate-200" />
                            <div className="w-0.5 h-6 bg-slate-400" />
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 mt-2">
                        Service: <strong className="text-white">Haircut + Beard Trim</strong> (Combo)
                      </p>
                    </div>

                    <div className="pt-3 border-t border-amber-900/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        Est. Wait Time:
                      </span>
                      <span className="text-amber-400 font-bold font-mono">
                        {formatCountdown(countdownSeconds)} (2 ahead)
                      </span>
                    </div>
                  </CardItem>

                  {/* Layer 3 (translateZ 90px): WhatsApp Summon Chat Pill ("Chair #1 Ready for Amit") */}
                  <CardItem
                    translateZ={90}
                    className={`rounded-2xl border-2 transition-all p-5 flex flex-col justify-between space-y-4 shadow-2xl relative group cursor-pointer ${
                      activeHotspot === "whatsapp" || simulatedCalled
                        ? "border-emerald-400 bg-gradient-to-b from-[#075E54]/45 via-slate-900/95 to-[#091510] ring-2 ring-emerald-400/30"
                        : "border-emerald-500/60 bg-gradient-to-b from-[#075E54]/30 via-slate-900/95 to-[#091510]"
                    }`}
                    onClick={() => {
                      setActiveHotspot("whatsapp");
                      playStationChime();
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          WhatsApp Summon Pill
                        </span>
                        <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {simulatedCalled ? "⚡ Just Dispatched" : "Auto-Dispatched"}
                        </Badge>
                      </div>

                      {/* Authentic WhatsApp Chat Bubble */}
                      <div className="mt-3 p-3.5 rounded-2xl rounded-tl-sm bg-[#075E54]/45 border border-[#128C7E]/50 text-[11px] text-slate-100 font-sans leading-relaxed shadow-inner">
                        <div className="flex items-center justify-between text-emerald-300 font-bold text-[10px] mb-1">
                          <span>💈 Ramesh Traditional Barber</span>
                          <span className="text-slate-400 font-mono text-[9px]">16:42</span>
                        </div>
                        <p>
                          Namaste {nextGuest}! Your chair is ready with <strong>Ramesh Kumar</strong>. Please step in within 3 minutes! ✂️
                        </p>
                        <div className="mt-1.5 flex items-center justify-end gap-1 text-[9px] text-emerald-400 font-mono font-bold">
                          <span>Delivered</span>
                          <span>✓✓</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-emerald-900/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Meta API Gateway:</span>
                      <span className="text-emerald-400 font-mono font-semibold">&lt; 180 ms</span>
                    </div>
                  </CardItem>

                  {/* Layer 2 (translateZ 60px): Floating Chrome Barber Tools & Chair Stylist Touchpad Tablet */}
                  <CardItem
                    translateZ={60}
                    className={`rounded-2xl border-2 transition-all p-5 flex flex-col justify-between space-y-4 shadow-2xl relative group cursor-pointer ${
                      activeHotspot === "tablet"
                        ? "border-amber-400 bg-gradient-to-b from-amber-950/50 via-slate-900/95 to-[#0d120f] ring-2 ring-amber-400/30"
                        : "border-amber-500/50 bg-gradient-to-b from-amber-950/30 via-slate-900/95 to-[#0d120f]"
                    }`}
                    onClick={() => {
                      setActiveHotspot("tablet");
                      playStationChime();
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <Scissors className="h-3.5 w-3.5" />
                          Chair Mirror Touchpad
                        </span>
                        <Badge variant="default" className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Chair #1 Active
                        </Badge>
                      </div>

                      <div className="mt-3 bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">In Chair Now</p>
                            <p className="text-base font-bold text-white">#{currentTicket} · {currentGuest}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Live Bill</p>
                            <p className="text-lg font-black text-emerald-400 font-mono">₹{liveBill}</p>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                          <Scissors className="h-3 w-3 text-amber-400" />
                          <span>Haircut in progress (Combo)</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-amber-900/60 flex items-center justify-between">
                      <Link
                        href="/s/ramesh-barber/station"
                        className="text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1.5 transition-colors group-hover:underline"
                      >
                        <span>Launch Station Numpad</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <span className="text-[10px] font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        PIN: 1234
                      </span>
                    </div>
                  </CardItem>
                </div>
              </CardBody>
            </CardContainer>

            {/* Bottom Vanity Shelf Accent */}
            <div className="relative z-10 mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-3">
              <span className="flex items-center gap-1.5 text-amber-300/90">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Zero Server Loops · Client RAM &amp; Web Audio Accelerated</span>
              </span>
              <span className="text-slate-400">
                Mounted on 4K Mirror Touchscreens &amp; Android Tablets
              </span>
            </div>
          </div>
        </ContainerScroll>
      </div>
    </section>
  );
};
