"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scissors,
  Store,
  Compass,
  Sparkles,
  ArrowRight,
  Search,
  Copy,
  Check,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  ArrowLeft,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface SalonNotFoundProps {
  slug: string;
}

export function SalonNotFound({ slug }: SalonNotFoundProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [searchHandle, setSearchHandle] = useState("");

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  };

  const handleHandleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchHandle.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean) {
      router.push(`/s/${clean}`);
    }
  };

  const displayHandle = slug ? `@${slug}` : "Unknown Handle";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* 1. TOP BRAND HEADER */}
      <header className="border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 transition-all shadow-lg shadow-black/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Scissors className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-white leading-tight tracking-tight group-hover:text-amber-400 transition-colors">
                  CutQueue
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Salon Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Smart Live Queue &amp; Chair Booking Network
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Compass className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">Explore Salons</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </div>
      </header>

      {/* 2. MAIN 404 HERO CONTAINER */}
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex-1 flex flex-col justify-center items-center text-center">
        {/* Glow backdrop */}
        <div className="relative w-full flex flex-col items-center">
          <div className="absolute -top-12 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Badge Graphic */}
          <div className="relative mb-6">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center p-4 ring-1 ring-amber-500/20">
              <div className="relative flex items-center justify-center">
                <Store className="h-12 w-12 sm:h-14 sm:w-14 text-amber-400 stroke-[1.75]" />
                <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                  <AlertTriangle className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <Badge variant="destructive" className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5">
              404 • Salon Not Found
            </Badge>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
              Unregistered Link
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-3">
            No Salon at this Handle
          </h1>

          {/* Handle Chip with Copy Action */}
          <div className="inline-flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-1.5 mb-5 max-w-full">
            <span className="text-xs text-slate-400 font-medium">Requested handle:</span>
            <code className="text-sm font-black text-amber-400 font-mono truncate max-w-[200px] sm:max-w-[280px]">
              {displayHandle}
            </code>
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy page link"
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Detailed explanation */}
          <p className="text-sm sm:text-base text-slate-300 max-w-lg mb-8 leading-relaxed">
            We searched the network but could not locate an active salon registered under{" "}
            <span className="text-amber-300 font-semibold">{displayHandle}</span>. The URL might have a typo,
            the salon owner may have changed their handle, or the salon hasn&apos;t joined the live queue platform yet.
          </p>

          {/* Primary Action Buttons (Android Touch Friendly >= 48px) */}
          <div className="w-full max-w-md space-y-3 mb-8">
            {/* Primary Customer CTA: Explore Registered Salons */}
            <Link
              href="/"
              className="w-full min-h-[50px] rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-all"
            >
              <Compass className="h-5 w-5" />
              <span>Explore Registered Salons</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>

            {/* Secondary Owner CTA: Register your salon */}
            <Link
              href={`/onboarding?slug=${encodeURIComponent(slug || "")}`}
              className="w-full min-h-[48px] rounded-2xl bg-slate-900 hover:bg-slate-850 text-amber-400 hover:text-amber-300 font-bold text-sm border border-amber-500/30 hover:border-amber-500/50 flex items-center justify-center gap-2 shadow-lg shadow-black/40 active:scale-[0.98] transition-all"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Are you the owner? Register your salon</span>
            </Link>
          </div>

          {/* Quick Handle Search Box */}
          <div className="w-full max-w-md p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 mb-6 text-left">
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Looking for a specific salon?
            </span>
            <form onSubmit={handleHandleSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono font-bold">
                  @
                </span>
                <input
                  type="text"
                  value={searchHandle}
                  onChange={(e) => setSearchHandle(e.target.value)}
                  placeholder="enter-salon-handle"
                  className="w-full min-h-[44px] pl-7 pr-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!searchHandle.trim()}
                className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Go</span>
              </button>
            </form>
          </div>

          {/* Helpful Tips Card */}
          <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs">
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-blue-400" />
                Check the Spelling
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Handles only contain lowercase letters, numbers, and dashes (e.g. <code>ramesh-barber</code>).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                Own this Handle?
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Claim {displayHandle} today. Registration takes under 60 seconds with instant setup.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} CutQueue Platform. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/" className="hover:text-amber-400 transition-colors">
              Directory
            </Link>
            <Link href="/register" className="hover:text-amber-400 transition-colors">
              Owner Onboarding
            </Link>
            <Link href="/dev" className="hover:text-amber-400 transition-colors">
              Demo Salons
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
