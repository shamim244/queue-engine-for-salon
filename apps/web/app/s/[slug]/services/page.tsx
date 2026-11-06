"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Salon } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SalonNavbar } from "@/components/salon/salon-navbar";
import { SalonServicesList } from "@/components/salon/salon-services-list";
import { ArrowLeft, Zap, ShieldCheck } from "lucide-react";

export default function DedicatedServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // SWR Cache First
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`salon_cache_${slug}`);
        if (cached) {
          setSalon(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}
    }

    const loadSalon = async () => {
      try {
        const res = await api.salons.get(slug);
        if (res.salon) {
          setSalon(res.salon);
          if (typeof window !== "undefined") {
            localStorage.setItem(`salon_cache_${slug}`, JSON.stringify(res.salon));
          }
        }
      } catch (err) {
        console.error("Failed to load salon services:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSalon();
  }, [slug]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* 1. TOP NAVBAR */}
      <SalonNavbar slug={slug} salon={salon} user={user} activeRoute="services" />

      {/* 2. MAIN SERVICES CONTAINER */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-8 space-y-6 flex-1">
        {/* Navigation Breadcrumbs & Top Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/s/${slug}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors py-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Salon Storefront</span>
          </Link>

          <Link
            href={`/s/${slug}/queue`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 px-3.5 py-2 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
          >
            <Zap className="h-4 w-4 fill-slate-950" />
            <span>Join Live Queue</span>
          </Link>
        </div>

        {/* Hero Title Header */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950 p-6 sm:p-8 space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>Transparent Pricing Guarantee</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {salon?.name || "Salon"} Full Service Catalog
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Choose any haircut, beard grooming, combo, or relaxing champy head massage. Every appointment includes sterile clippers, fresh razors, and hot towel refreshment.
          </p>
        </div>

        {/* Services List Component */}
        <SalonServicesList services={salon?.services || []} slug={slug} showAllLink={false} />
      </main>

      {/* 3. FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} {salon?.name || "Salon Engine"}. All rights reserved.</p>
      </footer>
    </div>
  );
}
