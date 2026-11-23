"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  Sparkles,
  MessageSquare,
  ExternalLink,
  Play,
  Tv,
  CheckCircle2,
  Clock,
  QrCode,
  Smartphone,
  Scissors
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

export const Hero2Point5D: React.FC<SectionProps> = ({ config }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Client-side ticking countdown for the ticket preview (Zero server waste)
  const [countdownSeconds, setCountdownSeconds] = useState(745); // 12m 25s

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    // Controlled tilt: max 10 degrees
    setTilt({ x: -(y * 12), y: x * 14 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32">
      {/* Ambient Gradient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-emerald-600/15 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-teal-600/10 blur-[110px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-cyan-600/10 blur-[110px] pointer-events-none rounded-full" />

      {/* Subtle perspective grid floor */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Dynamic Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-slate-300 text-xs font-medium mb-6 backdrop-blur-md shadow-lg shadow-emerald-950/40">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-semibold">{config.heroBadge}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300">Bun v1.4 + 2.5D Isometric Engine</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.14] max-w-4xl mx-auto">
          {config.heroHeadline}
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {config.heroSubheadline}
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 gap-2 h-12 px-7 text-sm"
            >
              {config.heroCtaText}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/s/ramesh-barber/station" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold gap-2 h-12 px-6 text-sm"
            >
              <Armchair className="h-4 w-4 text-emerald-400" />
              Launch Cutting Station
            </Button>
          </Link>

          <Link href="/dev" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="ghost"
              className="w-full text-slate-400 hover:text-white gap-2 h-12 px-5 text-sm"
            >
              <span>View All 6 Panels &rarr;</span>
            </Button>
          </Link>
        </div>

        {/* Social Proof Stats Bar */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/80 text-left">
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black text-white">500+</p>
            <p className="text-xs text-slate-400 mt-0.5">Active Chairs in India</p>
          </div>
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black text-emerald-400">&lt; 15 ms</p>
            <p className="text-xs text-slate-400 mt-0.5">Bun WebSocket Dispatch</p>
          </div>
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black text-teal-400">100%</p>
            <p className="text-xs text-slate-400 mt-0.5">Zero App Install Required</p>
          </div>
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black text-amber-400">99.98%</p>
            <p className="text-xs text-slate-400 mt-0.5">High-Volume Reliability</p>
          </div>
        </div>

        {/* 2.5D Isometric Scrollytelling Stage */}
        <div
          ref={stageRef}
          className="mt-14 max-w-5xl mx-auto relative perspective-1000 transition-all duration-300"
          style={{ perspective: "1200px" }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
        >
          {/* Spatial Spotlight Glow under the plane */}
          <div className="absolute -inset-3 bg-gradient-to-r from-emerald-600/30 via-teal-600/30 to-cyan-500/20 rounded-3xl blur-2xl opacity-40 -z-10" />

          {/* Floating Accent Pill: Live Notification Ribbon */}
          <div
            className="hidden sm:flex absolute -top-5 right-8 z-30 items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs font-semibold shadow-xl backdrop-blur-md animate-bounce"
            style={{ animationDuration: "3s" }}
          >
            <Scissors className="h-3.5 w-3.5 text-emerald-400" />
            <span>Chair #1 Ready for Amit Sharma</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Isometric Perspective Plane with Dynamic Tilt */}
          <div
            className="relative rounded-3xl bg-slate-950/90 border border-slate-700/80 p-5 sm:p-8 shadow-2xl backdrop-blur-2xl transition-transform duration-200 ease-out text-left"
            style={{
              transformStyle: "preserve-3d",
              transform: isHovered
                ? `rotateX(${6 + tilt.x}deg) rotateY(${-4 + tilt.y}deg) scale(1.01)`
                : "rotateX(6deg) rotateY(-4deg) rotateZ(0.5deg)",
              boxShadow: "0 30px 60px -15px rgba(16, 185, 129, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800/90 gap-3">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  2.5D Real-Time Queue Telemetry Flow
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    Spatial Multi-Plane
                  </Badge>
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>Salon: <strong>Ramesh Traditional Barber</strong></span>
                <span>·</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live Sync
                </span>
              </div>
            </div>

            {/* 3 Layered Isometric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Floating Customer Pocket Ticket with physical styling */}
              <div
                className="relative rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-950/50 via-slate-900/90 to-slate-950 p-5 flex flex-col justify-between space-y-4 shadow-2xl transition-all duration-300 hover:border-emerald-400 hover:shadow-emerald-500/20 group"
                style={{
                  transform: isHovered ? "translateZ(35px)" : "translateZ(20px)",
                }}
              >
                {/* Physical Ticket Notches */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-950 border-r border-emerald-500/40" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-950 border-l border-emerald-500/40" />

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5" />
                      Pocket Ticket
                    </span>
                    <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold">
                      Step Out for Tea
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <div className="text-4xl font-black text-white tracking-tight">#104</div>
                      <div className="text-xs font-semibold text-slate-300 mt-0.5">Amit Sharma</div>
                    </div>
                    {/* Barcode Mockup */}
                    <div className="text-right">
                      <div className="font-mono text-[9px] text-slate-500">SQ-104-RMSH</div>
                      <div className="flex gap-0.5 mt-1 justify-end h-6 items-end">
                        <div className="w-1 h-5 bg-slate-400" />
                        <div className="w-0.5 h-6 bg-slate-200" />
                        <div className="w-1.5 h-4 bg-slate-400" />
                        <div className="w-0.5 h-6 bg-slate-100" />
                        <div className="w-1 h-5 bg-slate-300" />
                        <div className="w-0.5 h-6 bg-slate-400" />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    Service: <strong className="text-slate-200">Haircut + Beard Trim</strong> (Combo)
                  </p>
                </div>

                <div className="pt-3 border-t border-emerald-900/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-400" />
                    Live Timer:
                  </span>
                  <span className="text-amber-400 font-bold font-mono">
                    {formatCountdown(countdownSeconds)} (2 ahead)
                  </span>
                </div>
              </div>

              {/* Card 2: WhatsApp Auto-Alert */}
              <div
                className="rounded-2xl border border-teal-500/50 bg-gradient-to-b from-teal-950/40 via-slate-900/90 to-slate-950 p-5 flex flex-col justify-between space-y-4 shadow-2xl transition-all duration-300 hover:border-teal-400 group"
                style={{
                  transform: isHovered ? "translateZ(45px)" : "translateZ(30px)",
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      WhatsApp Summon
                    </span>
                    <Badge variant="default" className="text-[10px] bg-teal-500/20 text-teal-300">
                      Auto-Dispatched
                    </Badge>
                  </div>

                  {/* Realistic WhatsApp Chat Bubble */}
                  <div className="mt-3 p-3 rounded-2xl rounded-tl-sm bg-[#075E54]/30 border border-[#128C7E]/40 text-[11px] text-slate-200 font-sans leading-relaxed shadow-inner">
                    <div className="flex items-center justify-between text-emerald-400 font-bold text-[10px] mb-1">
                      <span>💈 Ramesh Traditional Barber</span>
                      <span className="text-slate-400 font-mono text-[9px]">16:42</span>
                    </div>
                    <p>
                      Namaste Amit! Your chair is ready with <strong>Ramesh Kumar</strong>. Please step in within 3 minutes! ✂️
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-emerald-400 font-mono">
                      <span>Delivered</span>
                      <span>✓✓</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-teal-900/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Meta API Gateway:</span>
                  <span className="text-emerald-400 font-mono font-semibold">&lt; 180 ms</span>
                </div>
              </div>

              {/* Card 3: Barber Chair Station Touchpad */}
              <div
                className="rounded-2xl border border-cyan-500/50 bg-gradient-to-b from-cyan-950/40 via-slate-900/90 to-slate-950 p-5 flex flex-col justify-between space-y-4 shadow-2xl transition-all duration-300 hover:border-cyan-400 group"
                style={{
                  transform: isHovered ? "translateZ(35px)" : "translateZ(25px)",
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Armchair className="h-3.5 w-3.5" />
                      Chair Touchscreen
                    </span>
                    <Badge variant="default" className="text-[10px] bg-cyan-500/20 text-cyan-300">
                      Chair #1 Active
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <div>
                      <p className="text-[11px] text-slate-400">In Chair Now</p>
                      <p className="text-base font-bold text-white">#103 · Vikram</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">Live Bill</p>
                      <p className="text-base font-black text-emerald-400 font-mono">₹140</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-cyan-900/60 flex items-center justify-between">
                  <Link
                    href="/s/ramesh-barber/station"
                    className="text-xs font-semibold text-cyan-300 hover:text-white flex items-center gap-1 transition-colors group-hover:underline"
                  >
                    <span>Launch Station Numpad</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    PIN: 1234
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
