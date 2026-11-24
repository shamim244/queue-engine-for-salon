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

export const Hero2Point5D: React.FC<SectionProps> = ({ config }) => {
  // Client-side ticking countdown for the ticket preview (Zero server waste)
  const [countdownSeconds, setCountdownSeconds] = useState(745); // 12m 25s
  const [activeStationTab, setActiveStationTab] = useState<"photo" | "blueprint">("photo");

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
              <div className="flex flex-wrap items-center justify-between px-3.5 py-2 border-b border-slate-800/70 bg-slate-900/70 text-xs gap-2">
                <span className="font-mono text-[11px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5" />
                  2.5D Architectural Salon Station Diagram
                </span>
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
                    📸 2.5D Station Diorama
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
                <div className="relative aspect-[16/9] w-full overflow-hidden group">
                  <img
                    src="/landing/hero_salon_station_2_5d.jpg"
                    alt="2.5D Cutaway Salon Cutting Station with Vintage Leather Chair and Mirror Tablet"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/30 pointer-events-none" />

                  {/* Overlay Badges for Realism */}
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                    <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/40 text-xs text-white flex items-center gap-2 shadow-xl">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Styling Bay #1 · Vintage Emerald Leather Chair &amp; Walnut Counter</span>
                    </div>
                    <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 text-xs font-mono text-emerald-300 shadow-xl">
                      Live Mirror Tablet: #103 Vikram · ₹140
                    </div>
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
                    className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/40 via-slate-900/95 to-[#0d120f] p-5 flex flex-col justify-between space-y-4 shadow-2xl relative overflow-hidden group"
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
                          <div className="text-4xl font-black text-white tracking-tight">#104</div>
                          <div className="text-xs font-semibold text-slate-200 mt-0.5">Amit Sharma</div>
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
                    className="rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-b from-[#075E54]/30 via-slate-900/95 to-[#091510] p-5 flex flex-col justify-between space-y-4 shadow-2xl relative group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          WhatsApp Summon Pill
                        </span>
                        <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Auto-Dispatched
                        </Badge>
                      </div>

                      {/* Authentic WhatsApp Chat Bubble */}
                      <div className="mt-3 p-3.5 rounded-2xl rounded-tl-sm bg-[#075E54]/45 border border-[#128C7E]/50 text-[11px] text-slate-100 font-sans leading-relaxed shadow-inner">
                        <div className="flex items-center justify-between text-emerald-300 font-bold text-[10px] mb-1">
                          <span>💈 Ramesh Traditional Barber</span>
                          <span className="text-slate-400 font-mono text-[9px]">16:42</span>
                        </div>
                        <p>
                          Namaste Amit! Your chair is ready with <strong>Ramesh Kumar</strong>. Please step in within 3 minutes! ✂️
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
                    className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/30 via-slate-900/95 to-[#0d120f] p-5 flex flex-col justify-between space-y-4 shadow-2xl relative group"
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
                            <p className="text-base font-bold text-white">#103 · Vikram</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Live Bill</p>
                            <p className="text-lg font-black text-emerald-400 font-mono">₹140</p>
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
