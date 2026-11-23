"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Armchair, Sparkles, MessageSquare, ExternalLink, Play, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

export const Hero2Point5D: React.FC<SectionProps> = ({ config }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32">
      {/* Ambient Gradient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-600/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-teal-600/10 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-cyan-600/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Dynamic Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs font-medium mb-6 backdrop-blur-sm shadow-inner">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-semibold">{config.heroBadge}</span>
          <span className="text-slate-500">·</span>
          <span>Bun v1.4 + 2.5D Isometric Engine</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
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
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 gap-2 h-12 px-7"
            >
              {config.heroCtaText}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/s/ramesh-barber/station" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full border-slate-700 hover:bg-slate-900 text-slate-200 font-semibold gap-2 h-12 px-6"
            >
              <Armchair className="h-4 w-4 text-emerald-400" />
              Launch Cutting Station
            </Button>
          </Link>

          <Link href="/dev" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="ghost"
              className="w-full text-slate-400 hover:text-white gap-2 h-12 px-5"
            >
              <span>View All 6 Panels &rarr;</span>
            </Button>
          </Link>
        </div>

        {/* Social Proof Stats Bar */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/60 text-left">
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
          className="mt-14 max-w-5xl mx-auto relative perspective-1000"
          style={{ perspective: "1200px" }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="absolute -inset-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 rounded-3xl blur-2xl opacity-25" />

          {/* Isometric Perspective Plane */}
          <div
            className={`relative rounded-3xl bg-slate-900/90 border border-slate-700/80 p-5 sm:p-8 shadow-2xl backdrop-blur-xl transition-transform duration-500 ease-out text-left ${
              isHovered
                ? "sm:rotate-x-3 sm:-rotate-y-2 sm:translate-y--2"
                : "sm:rotate-x-6 sm:-rotate-y-4 sm:rotate-z-1"
            }`}
            style={{
              transformStyle: "preserve-3d",
              boxShadow: "0 25px 50px -12px rgba(16, 185, 129, 0.15)",
            }}
          >
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  2.5D Real-Time Queue Telemetry Flow
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    Isometric Spatial View
                  </Badge>
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>Salon: <strong>Ramesh Traditional Barber</strong></span>
                <span>·</span>
                <span className="text-emerald-400">WebSocket Connected</span>
              </div>
            </div>

            {/* 3 Layered Isometric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Floating Customer Pocket Ticket */}
              <div
                className="rounded-xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 to-slate-900/80 p-4 flex flex-col justify-between space-y-3 shadow-lg transform transition-transform hover:-translate-y-1"
                style={{ transform: "translateZ(20px)" }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                      Customer Pocket Ticket
                    </span>
                    <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-300">
                      Step Out for Tea
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">#104</span>
                    <span className="text-xs text-slate-300">Amit Sharma</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Service: <strong>Haircut + Beard Trim</strong> (Combo)
                  </p>
                </div>
                <div className="pt-3 border-t border-emerald-900/50 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Estimated Wait:</span>
                  <span className="text-amber-400 font-bold font-mono">12 mins (2 ahead)</span>
                </div>
              </div>

              {/* Card 2: WhatsApp Auto-Alert */}
              <div
                className="rounded-xl border border-teal-500/40 bg-gradient-to-b from-teal-950/40 to-slate-900/80 p-4 flex flex-col justify-between space-y-3 shadow-lg transform transition-transform hover:-translate-y-1"
                style={{ transform: "translateZ(30px)" }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      WhatsApp Alert Dispatch
                    </span>
                    <Badge variant="default" className="text-[10px] bg-teal-500/20 text-teal-300">
                      Auto-Sent
                    </Badge>
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 font-sans leading-relaxed">
                    <p className="font-semibold text-emerald-300">💈 Ramesh Traditional Barber</p>
                    <p className="mt-1">
                      Namaste Amit! Your chair is ready with <strong>Ramesh Kumar</strong>. Please step in within 3 mins! ✂️
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-teal-900/50 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Gateway:</span>
                  <span className="text-emerald-400 font-mono">Meta API &lt;200ms</span>
                </div>
              </div>

              {/* Card 3: Barber Chair Station */}
              <div
                className="rounded-xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/40 to-slate-900/80 p-4 flex flex-col justify-between space-y-3 shadow-lg transform transition-transform hover:-translate-y-1"
                style={{ transform: "translateZ(25px)" }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                      Barber Mirror Station UI
                    </span>
                    <Badge variant="default" className="text-[10px] bg-cyan-500/20 text-cyan-300">
                      Chair #1 Active
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Currently Serving</p>
                      <p className="text-base font-bold text-white">#103 · Vikram</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Live Bill</p>
                      <p className="text-base font-black text-emerald-400">₹140</p>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-cyan-900/50 flex items-center justify-between">
                  <Link
                    href="/s/ramesh-barber/station"
                    className="text-xs font-semibold text-cyan-300 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>Open Mirror Numpad</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-[11px] text-slate-400">PIN: 1234</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
