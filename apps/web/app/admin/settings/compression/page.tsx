"use client";

import React, { Suspense } from "react";
import { SettingsNav } from "@/components/admin/settings-nav";
import { CompressionCenter } from "@/components/admin/compression-center";
import { Zap, ShieldCheck, ArrowRight, Gauge, Layers } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function CompressionPageContent() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Zap className="h-7 w-7 text-amber-400" />
              <span>Multi-Tier Compression & Caching</span>
            </h1>
            <Badge variant="success" className="text-xs">
              LIVE ENGINE
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Zero-error cascading fallback: <strong>Zstandard &rarr; Brotli &rarr; Gzip &rarr; Raw</strong> for ultra-fast load times on 2G/3G rural networks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings/system"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>System Gateways</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <SettingsNav />

      {/* Quick Architecture Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Zap className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Brotli -91% Savings</div>
            <div className="text-[11px] text-slate-400">Native Bun node:zlib acceleration</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4.5 w-4.5 text-indigo-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Universal Gzip Safety</div>
            <div className="text-[11px] text-slate-400">Automatic fallback for legacy devices</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Layers className="h-4.5 w-4.5 text-sky-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Zero-Error Cascading</div>
            <div className="text-[11px] text-slate-400">Graceful fallback to raw identity</div>
          </div>
        </div>
      </div>

      {/* Central Interactive Compression Console */}
      <CompressionCenter />
    </div>
  );
}

export default function CompressionSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading compression console...</div>}>
      <CompressionPageContent />
    </Suspense>
  );
}
