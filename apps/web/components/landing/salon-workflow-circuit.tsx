"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
  QrCode,
  Zap,
  Armchair,
  MessageSquare,
  Tv,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Scissors
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import {
  SalonBackgroundPattern,
  BarberChairVector,
  ScissorsShearsVector,
  BarberPoleVector,
  HairClipperVector,
} from "./salon-vector-art";
import type { SectionProps } from "./types";

export const SalonWorkflowCircuit: React.FC<SectionProps> = ({ config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const node1Ref = useRef<HTMLDivElement>(null);
  const node2Ref = useRef<HTMLDivElement>(null);
  const node3Ref = useRef<HTMLDivElement>(null);
  const node4Ref = useRef<HTMLDivElement>(null);
  const node5Ref = useRef<HTMLDivElement>(null);

  const nodes = [
    {
      ref: node1Ref,
      number: "01",
      title: "Entrance Door QR",
      subtitle: "Acrylic Stand / Glass Door",
      desc: "Walk-in guests scan door QR with default camera. Zero app install; pocket ticket #104 issued with live wait time.",
      icon: QrCode,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      badge: "1-Scan Check-In",
      tag: "Acrylic Door Stand",
    },
    {
      ref: node2Ref,
      number: "02",
      title: "Bun Queue Engine",
      subtitle: "In-Memory State Authority",
      desc: "Sub-15ms atomic dispatch. Tracks stylists, chairs, combo durations, and estimated chair-ready times.",
      icon: Zap,
      color: "text-teal-400 bg-teal-500/10 border-teal-500/30",
      badge: "Sub-15ms Sync",
      tag: "Zero Server Loops",
    },
    {
      ref: node3Ref,
      number: "03",
      title: "Barber Chair Station",
      subtitle: "Mirror Stylist Tablet",
      desc: "Mounted at styling mirrors. Barber enters PIN: 1234, taps 'Call Next', and manages live haircut bill total.",
      icon: Armchair,
      vector: BarberChairVector,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      badge: "1-Tap Touchpad",
      tag: "Styling Chair Touchpad",
    },
    {
      ref: node4Ref,
      number: "04",
      title: "WhatsApp Summon",
      subtitle: "Meta Cloud API Gateway",
      desc: "Automated summon ping to Amit: 'Your chair is ready with Ramesh Kumar. Please step in within 3 minutes! ✂️'",
      icon: MessageSquare,
      color: "text-emerald-300 bg-[#075E54]/20 border-emerald-500/30",
      badge: "3-Min Grace Window",
      tag: "Pocket Summon Ping",
    },
    {
      ref: node5Ref,
      number: "05",
      title: "Lobby Departure TV",
      subtitle: "Waiting Area 4K Mirror",
      desc: "Airport departure board keeps waiting clients calm. Customer privacy phone masking (+91 98*** 12345).",
      icon: Tv,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
      badge: "Privacy Protected",
      tag: "Lounge 4K Mirror",
    },
  ];

  return (
    <section id="circuit" className="py-24 bg-[#0a0f0d] relative overflow-hidden">
      {/* Illustrated Salon Vector Wallpaper Pattern */}
      <SalonBackgroundPattern opacity={0.14} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Background Ambient Studio Halos */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[350px] bg-gradient-to-r from-amber-600/10 via-emerald-600/15 to-transparent blur-[150px] pointer-events-none rounded-full z-0" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-amber-500/5 blur-[120px] pointer-events-none rounded-full z-0" />

      {/* Decorative Illustrated Salon Watermarks */}
      <div className="hidden xl:block absolute -left-6 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none">
        <HairClipperVector size={220} className="text-teal-400" />
      </div>
      <div className="hidden xl:block absolute -right-6 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none">
        <BarberPoleVector size={200} className="text-amber-400" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3 px-3.5 py-1 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 shadow-lg shadow-amber-950/40"
          >
            💈 Magic UI Animated Pipeline · Physical Salon Circuit
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            How The 5-Node Salon Queue Engine Operates
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
            From the entrance door acrylic QR stand to the chair mirror touchpad, follow the real-time operational circuit that eliminates crowded waiting benches and lost weekend revenue.
          </p>
        </div>

        {/* 5-Node Telemetry Container */}
        <div
          ref={containerRef}
          className="relative max-w-6xl mx-auto rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-slate-950 to-[#080d0a] border-2 border-slate-800 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl overflow-hidden"
        >
          {/* Subtle Walnut Header Trim */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-emerald-500/40 to-teal-500/40" />

          {/* Animated Beams connecting the salon touchpoints:
              [Door QR Acrylic Stand] ──────► [Bun Core Engine] ──────► [Barber Chair Touchpad]
                                                         │
                                                         └──────────────► [WhatsApp + Lobby 4K TV] */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={node1Ref}
            toRef={node2Ref}
            duration={3.8}
            gradientStartColor="#10b981"
            gradientStopColor="#047857"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={node2Ref}
            toRef={node3Ref}
            duration={4.2}
            delay={0.4}
            gradientStartColor="#f59e0b"
            gradientStopColor="#d97706"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={node2Ref}
            toRef={node4Ref}
            duration={4.0}
            delay={0.8}
            gradientStartColor="#10b981"
            gradientStopColor="#128c7e"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={node2Ref}
            toRef={node5Ref}
            duration={4.6}
            delay={1.2}
            gradientStartColor="#06b6d4"
            gradientStopColor="#0284c7"
          />

          {/* Node Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 relative z-10">
            {nodes.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.number}
                  ref={node.ref}
                  className="rounded-2xl bg-gradient-to-b from-slate-950 to-[#0c120f] border-2 border-slate-800/90 p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-amber-500/50 transition-all duration-300 shadow-xl group hover:scale-[1.02]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono font-bold text-amber-400/80">
                        NODE {node.number}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${node.color}`}
                      >
                        {node.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors shrink-0 shadow-inner">
                        {node.vector ? (
                          <node.vector size={20} className="text-amber-400 group-hover:text-emerald-400" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                          {node.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {node.subtitle}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed mt-2">
                      {node.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Link
                    </span>
                    <span className="text-slate-400">{node.tag}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Circuit Footer Bar */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div className="flex items-center gap-2 text-slate-300">
              <Scissors className="h-4 w-4 text-amber-400" />
              <span>
                Zero hardware dependencies · Runs on existing salon Android phones, tablets &amp; smart TVs
              </span>
            </div>
            <Link href="/s/ramesh-barber/station">
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500/40 bg-slate-900/90 text-xs text-amber-200 hover:text-white hover:bg-slate-800 gap-1.5 h-9"
              >
                <span>Test Live Chair Numpad</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
