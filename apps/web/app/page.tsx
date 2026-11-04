"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Crown,
  Sliders,
  Armchair,
  QrCode,
  Tv,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Clock,
  Store,
  Layers,
  ChevronRight,
  Star,
  Zap,
  Radio,
  ExternalLink,
  MessageSquare,
  Users,
  CreditCard,
  Building2,
  FileText,
  BadgePercent,
  Play,
  Smartphone,
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function MarketingHomePage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              EQ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Engine Que
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Core
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Enterprise Salon Queue Engine
              </p>
            </div>
          </Link>

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-medium text-slate-300">
            <a href="#architecture" className="hover:text-white transition-colors">
              Architecture
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="hover:text-white transition-colors">
              Testimonials
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/dev"
              className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-blue-500/40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Open Developer & QA Multi-Panel Launcher"
            >
              <span>🧪 Dev Launcher</span>
            </Link>

            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>

            <Link href="/register">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-600/25 gap-1.5">
                Register Salon
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-cyan-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Engine Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs font-medium mb-6 backdrop-blur-sm shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-blue-400 font-semibold">Dual-Engine Operating System</span>
            <span className="text-slate-500">·</span>
            <span>Bun v1.4 + Real-Time WebSockets</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            The <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">Real-Time Queue Engine</span> for Modern Salons &amp; Solo Barbers
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate crowded benches and lost walk-ins. Zero-app QR check-in, automated WhatsApp chair alerts, and tactile mirror stations—built to scale from village barbers to luxury multi-chair chains.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/30 gap-2 h-12 px-7">
                Start Free Salon Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/s/ramesh-barber/station" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full border-slate-700 hover:bg-slate-900 text-slate-200 font-semibold gap-2 h-12 px-6">
                <Armchair className="h-4 w-4 text-emerald-400" />
                Live Cutting Station Demo
              </Button>
            </Link>

            <Link href="/dev" className="w-full sm:w-auto">
              <Button size="lg" variant="ghost" className="w-full text-slate-400 hover:text-white gap-2 h-12 px-5">
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
              <p className="text-2xl sm:text-3xl font-black text-blue-400">100%</p>
              <p className="text-xs text-slate-400 mt-0.5">Zero App Install Required</p>
            </div>
            <div className="p-3">
              <p className="text-2xl sm:text-3xl font-black text-amber-400">99.98%</p>
              <p className="text-xs text-slate-400 mt-0.5">High-Volume Reliability</p>
            </div>
          </div>

          {/* Hero Live Queue Simulation Card */}
          <div className="mt-14 max-w-5xl mx-auto relative">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-3xl blur-xl opacity-20" />
            
            <div className="relative rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-700/80 p-5 sm:p-8 shadow-2xl backdrop-blur-xl text-left">
              {/* Card Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-bold text-sm text-white flex items-center gap-2">
                    Live Queue Telemetry Simulation
                    <Badge variant="purple" className="text-[10px]">Real-Time Hub</Badge>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>Salon: <strong>Ramesh Traditional Barber</strong></span>
                  <span>·</span>
                  <span className="text-emerald-400">Socket Connected</span>
                </div>
              </div>

              {/* Three Mockup Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Customer Pocket Ticket */}
                <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                        Customer Mobile Pocket Ticket
                      </span>
                      <Badge variant="default" className="text-[10px]">Step Out for Tea</Badge>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">#104</span>
                      <span className="text-xs text-slate-300">Amit Sharma</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Service: <strong>Haircut + Beard Trim</strong> (Combo)
                    </p>
                  </div>
                  <div className="pt-3 border-t border-blue-900/50 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Estimated Wait:</span>
                    <span className="text-amber-400 font-bold font-mono">12 mins (2 ahead)</span>
                  </div>
                </div>

                {/* 2. WhatsApp Notification Alert */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        WhatsApp Alert Dispatch
                      </span>
                      <Badge variant="success" className="text-[10px]">Auto-Sent</Badge>
                    </div>
                    <div className="mt-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 font-sans leading-relaxed">
                      <p className="font-semibold text-emerald-300">💈 Ramesh Traditional Barber</p>
                      <p className="mt-1">
                        Namaste Amit! Your chair is ready with <strong>Ramesh Kumar</strong>. Please step in within 3 mins! ✂️
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-emerald-900/50 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Gateway:</span>
                    <span className="text-emerald-400 font-mono">WhatsApp Meta API &lt;200ms</span>
                  </div>
                </div>

                {/* 3. Barber Chair Touch Station */}
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                        Barber Mirror Station UI
                      </span>
                      <Badge variant="purple" className="text-[10px]">Chair #1 Active</Badge>
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
                  <div className="pt-3 border-t border-indigo-900/50 flex items-center justify-between">
                    <Link
                      href="/s/ramesh-barber/station"
                      className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 transition-colors"
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

      {/* 3. Complete Salon Operating Capabilities */}
      <section id="capabilities" className="py-20 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <Badge variant="purple" className="mb-3 px-3 py-1 text-xs">
              Unified Platform Capabilities
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything Your Salon Needs in One Unified Engine
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              Engine Que unifies front-of-house customer check-ins with in-chair salon station operations on a single, lightning-fast architecture.
            </p>
          </div>

          {/* Capabilities Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Capability A: Customer Flow */}
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="default" className="text-xs px-2.5 py-0.5">
                    Customer Experience
                  </Badge>
                  <span className="text-xs font-mono text-blue-400">Zero App Download</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Smartphone className="h-6 w-6 text-blue-400" />
                  Self-Service Mobile Journey
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                  Customers scan your salon door QR code, pick their grooming services, and receive a live pocket ticket with real-time countdowns.
                </p>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-300">
                      <strong>1-Scan QR Door Check-In:</strong> Generates instant queue ticket in &lt;1 second without account passwords or app store friction.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-300">
                      <strong>WhatsApp Arrival Alerts:</strong> Automatic notification when their chair is ready, so customers can grab tea or run errands nearby.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-300">
                      <strong>Dynamic NPCI UPI QR:</strong> Generates exact-amount payment QR codes on client screens for seamless 1-tap UPI payments.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-300">
                      <strong>Live Elapsed Timers:</strong> Smooth, in-memory countdown clocks running entirely on client device hardware.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <Link href="/s/ramesh-barber" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <span>Open Door QR Demo &rarr;</span>
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="outline" className="text-xs border-slate-700 hover:bg-slate-800 text-slate-200">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>

            {/* Capability B: Floor & Station Operations */}
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="purple" className="text-xs px-2.5 py-0.5">
                    Floor &amp; Station Operations
                  </Badge>
                  <span className="text-xs font-mono text-purple-400">Mirror &amp; Tablet Ready</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Scissors className="h-6 w-6 text-purple-400" />
                  Stylist &amp; Station Management
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                  Equip each station with a mirror tablet or smartphone interface to call next clients, record custom service prices, and coordinate chairs.
                </p>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-300">
                      <strong>Touch Station Desk:</strong> 1-tap call-next, seated, finish, and soft-bump actions designed for wet barber hands.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-300">
                      <strong>4-Digit Rapid PIN Unlock:</strong> Stylists switch chairs in &lt;200ms on shared mirror tablets without logging out.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-300">
                      <strong>Lobby Departure Board TV:</strong> Airport departure screen keeps waiting lounges calm while masking customer phones.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-300">
                      <strong>1-Tap Walk-in Quick Add:</strong> Add non-smartphone or elderly walk-in clients directly from the chair.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <Link href="/s/ramesh-barber/station" className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  <span>Open Station Desk Demo &rarr;</span>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-500 text-white">
                    Start Salon Trial
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bento Feature Grid */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="purple" className="mb-3 px-3 py-1 text-xs">
              Operational Superiority
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              6 Pillars of the Engine Que Experience
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              Engineered from first principles to solve queue frustration for customers, stylists, and salon owners alike.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                  <QrCode className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Zero-Friction Door QR</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Customers scan a printable A4 mirror poster at the entrance with any phone camera. Instant digital ticket generated in under 3 seconds without installing any app.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-xs font-medium text-blue-400 flex items-center gap-1">
                <span>Sub-25KB Lightweight</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">WhatsApp Queue Telemetry</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Clients step away for tea, groceries, or relax nearby. Automated WhatsApp and SMS alerts ping them 3 minutes before their chair opens up.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-xs font-medium text-emerald-400 flex items-center gap-1">
                <span>3-Min Soft Bump Protocol</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                  <Armchair className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">4-Digit Mirror Station PINs</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Stylists share mirror-mounted tablets. A tactile 4-digit keypad unlocks chair dispatch in &lt;200ms and switches stylists in 2 seconds flat.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-xs font-medium text-purple-400 flex items-center gap-1">
                <span>Shared Tablet Switching</span>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                  <Tv className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Public Lobby TV Board</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Turn any smart TV into an airport departure board. Displays ticket numbers, stylist chairs, and masked phone numbers to safeguard customer privacy.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-xs font-medium text-rose-400 flex items-center gap-1">
                <span>Airport Departure Board</span>
              </div>
            </div>

            {/* Pillar 5 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                  <Sliders className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Dynamic Speed Calibration</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Stylists calibrate their personal service speed (15m–60m). The core engine automatically shifts wait times for all downstream waiting customers.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-xs font-medium text-amber-400 flex items-center gap-1">
                <span>Dynamic Wait Times</span>
              </div>
            </div>

            {/* Pillar 6 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Centralized Franchise Control</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Super Admin HQ manages multi-tenant quotas, subscription tier gating (SOLO, PRO, ENTERPRISE), emergency kill-switch lockdown, and platform analytics.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-xs font-medium text-cyan-400 flex items-center gap-1">
                <span>Tier Quota Enforcement</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works (3 Steps) */}
      <section id="how-it-works" className="py-20 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="success" className="mb-3 px-3 py-1 text-xs">
              Zero Friction Setup
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              From Scan to Chair in 3 Simple Steps
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              Designed so even first-time customers and non-tech barbers can operate effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <span className="text-5xl font-black text-slate-800 absolute top-4 right-4">01</span>
              <div className="h-12 w-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold mb-4">
                <QrCode className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Scan Entrance QR Code</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Customer scans the salon QR on the glass door or counter. Selects their preferred service (Haircut, Shave, Beard) in 2 taps.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <span className="text-5xl font-black text-slate-800 absolute top-4 right-4">02</span>
              <div className="h-12 w-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Relax Nearby with WhatsApp</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Live queue position updates on mobile. Client grabs tea or runs an errand without wasting hours waiting on a bench.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <span className="text-5xl font-black text-slate-800 absolute top-4 right-4">03</span>
              <div className="h-12 w-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold mb-4">
                <Armchair className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Step In &amp; 1-Tap Checkout</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Barber summons customer, seats them, customizes the bill at chair if needed, and completes with Cash or UPI QR.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Transparent SaaS Subscription Plans */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="purple" className="mb-3 px-3 py-1 text-xs">
              Simple, Predictable Plans
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              SaaS Plans That Scale With Your Salon
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              One unified platform. Pick the subscription plan tailored to your salon capacity and branch footprint.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Plan 1: Starter Plan */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <Badge variant="default" className="text-xs mb-3">Starter Plan</Badge>
                <h3 className="text-xl font-bold text-white">Starter Edition</h3>
                <p className="text-xs text-slate-400 mt-1">For single-location boutique studios &amp; barbers</p>
                
                <div className="my-6">
                  <span className="text-4xl font-black text-white">₹499</span>
                  <span className="text-xs text-slate-400 ml-1.5 font-medium">/ month</span>
                </div>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>1 Salon Location</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Up to 3 Stylist Chairs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Customer QR Check-Ins</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>WhatsApp Arrival Alerts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Dynamic NPCI UPI QR &amp; Cash</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Client-Side Live Service Timers</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link href="/register">
                  <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-200">
                    Start 14-Day Free Trial
                  </Button>
                </Link>
              </div>
            </div>

            {/* Plan 2: Pro Plan */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-900 border-2 border-blue-500/80 shadow-2xl shadow-blue-500/10 flex flex-col justify-between relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold tracking-wide uppercase shadow-md">
                Most Popular
              </span>

              <div>
                <Badge variant="purple" className="text-xs mb-3">Pro Plan</Badge>
                <h3 className="text-xl font-bold text-white">Pro Edition</h3>
                <p className="text-xs text-slate-400 mt-1">For high-turnover salons, parlors &amp; spas</p>
                
                <div className="my-6">
                  <span className="text-4xl font-black text-white">₹1,499</span>
                  <span className="text-xs text-slate-400 ml-1.5 font-medium">/ month</span>
                </div>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Up to 5 Salon Locations</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Up to 10 Stylists per Location</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Airport-Style Lobby Departure Board TV</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>4-Digit Quick PIN Mirror Switching</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Split Service Up-sells &amp; Speed Sliders</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link href="/register">
                  <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30">
                    Get Started with Pro
                  </Button>
                </Link>
              </div>
            </div>

            {/* Plan 3: Enterprise Plan */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <Badge variant="warning" className="text-xs mb-3">Enterprise Plan</Badge>
                <h3 className="text-xl font-bold text-white">Enterprise Edition</h3>
                <p className="text-xs text-slate-400 mt-1">For multi-branch regional brands &amp; franchises</p>
                
                <div className="my-6">
                  <span className="text-4xl font-black text-white">₹4,999</span>
                  <span className="text-xs text-slate-400 ml-1.5 font-medium">/ month</span>
                </div>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Locations &amp; Stylist Chairs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Super Admin Platform Command Center</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>White-Label Custom Brand &amp; Domain</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Custom WhatsApp &amp; SMS Gateway Integration</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Dedicated SLA &amp; 24/7 Account Manager</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link href="/register">
                  <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-200">
                    Contact for Enterprise
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Testimonials */}
      <section id="testimonials" className="py-20 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="purple" className="mb-3 px-3 py-1 text-xs">
              Trusted on Ground
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Loved by Traditional Barbers &amp; Modern Salons
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Ramesh Review */}
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                  &ldquo;Grahak ab dukaan ke bahar bheed nahi lagate. Chai peene chale jaate hain aur WhatsApp aate hi aa jaate hain. Cash bill bhi aasaani se badal leta hoon!&rdquo;
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-white text-sm">Ramesh Kumar</h5>
                  <p className="text-xs text-slate-400">Owner, Ramesh Traditional Barber, Jaipur</p>
                </div>
                <Badge variant="warning" className="text-[10px]">Solo Rural Barber</Badge>
              </div>
            </div>

            {/* Vikram Review */}
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                  &ldquo;Our customer turnover increased by 28%. Our lobby is peaceful and our stylists love the 4-digit mirror tablet PIN switch. The departure TV screen looks world-class.&rdquo;
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-white text-sm">Vikram Sethi</h5>
                  <p className="text-xs text-slate-400">Managing Director, Aura Luxury Salon, Mumbai</p>
                </div>
                <Badge variant="default" className="text-[10px]">Modern Multi-Station</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Final CTA Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900 border border-blue-500/40 shadow-2xl backdrop-blur-xl">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to Modernize Your Salon Queue Today?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-4 max-w-xl mx-auto">
              Launch your salon in less than 3 minutes. Zero setup fees, instant printable door QR poster, and full WhatsApp notifications.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-12 px-8 shadow-lg shadow-blue-600/30">
                  Launch Your Salon Now &rarr;
                </Button>
              </Link>
              <Link href="/dev">
                <Button size="lg" variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-200 h-12 px-6">
                  Open QA Testing Launcher
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Global Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-8 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                EQ
              </div>
              <div>
                <span className="font-bold text-white text-sm">Engine Que System</span>
                <p className="text-[11px] text-slate-500">Enterprise Salon Operations Suite</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/dev" className="hover:text-white transition-colors">
                Dev Launcher
              </Link>
              <Link href="/login" className="hover:text-white transition-colors">
                Universal Login
              </Link>
              <Link href="/register" className="hover:text-white transition-colors">
                Register Salon
              </Link>
              <Link href="/admin" className="hover:text-white transition-colors">
                Super Admin
              </Link>
              <Link href="/owner" className="hover:text-white transition-colors">
                Owner Hub
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-500">
            <div>
              Engine Que System &copy; 2026. Enterprise Decoupled Monorepo Architecture. All rights reserved.
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bun Core 3001 Connected · WebSocket Live</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
