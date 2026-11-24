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
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedBeam } from "@/components/ui/animated-beam";
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
    },
    {
      ref: node3Ref,
      number: "03",
      title: "Barber Chair Station",
      subtitle: "Mirror Stylist Tablet",
      desc: "Mounted at styling mirrors. Barber enters PIN: 1234, taps 'Call Next', and manages live haircut bill total.",
      icon: Armchair,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      badge: "1-Tap Touchpad",
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
    },
  ];

  return (
    <section className="py-20 bg-slate-950 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[350px] bg-emerald-600/10 blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
          >
            The Operational Pipeline
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How The 5-Node Salon Queue Engine Operates
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
            From the front door acrylic QR stand to the chair mirror tablet, follow the real-time operational circuit that eliminates crowded waiting benches.
          </p>
        </div>

        {/* 5-Node Telemetry Container */}
        <div
          ref={containerRef}
          className="relative max-w-6xl mx-auto rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 shadow-2xl backdrop-blur-xl"
        >
          {/* Animated Beams between primary nodes */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={node1Ref}
            toRef={node2Ref}
            duration={4}
            gradientStartColor="#10b981"
            gradientStopColor="#047857"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={node2Ref}
            toRef={node3Ref}
            duration={4.5}
            delay={0.5}
            gradientStartColor="#14b8a6"
            gradientStopColor="#0f766e"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={node3Ref}
            toRef={node4Ref}
            duration={4.2}
            delay={1}
            gradientStartColor="#f59e0b"
            gradientStopColor="#d97706"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={node3Ref}
            toRef={node5Ref}
            duration={4.8}
            delay={1.5}
            gradientStartColor="#3b82f6"
            gradientStopColor="#2563eb"
          />

          {/* Node Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 relative z-10">
            {nodes.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.number}
                  ref={node.ref}
                  className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-colors shadow-lg group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        NODE {node.number}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${node.color}`}
                      >
                        {node.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
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
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Link
                    </span>
                    <span>Ready</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Circuit Footer Bar */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>
                Zero hardware dependencies · Runs on existing salon phones, tablets & smart TVs
              </span>
            </div>
            <Link href="/s/ramesh-barber/station">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 bg-slate-900 text-xs text-slate-200 hover:text-white hover:bg-slate-800 gap-1.5 h-9"
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
