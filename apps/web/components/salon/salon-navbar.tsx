"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Scissors, Menu, X, ExternalLink, Zap, User as UserIcon, Calendar, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Salon, AuthUser } from "@/lib/api";
interface SalonNavbarProps {
  slug: string;
  salon: Salon | null;
  user: AuthUser | null;
  activeRoute?: "home" | "queue" | "services" | "book";
}

export function SalonNavbar({ slug, salon, user, activeRoute = "home" }: SalonNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navMenuItems = [
    { label: "Home", href: `/s/${slug}`, active: activeRoute === "home" },
    { label: "Services", href: `/s/${slug}/services`, active: activeRoute === "services" },
    { label: "Live Queue", href: `/s/${slug}/queue`, active: activeRoute === "queue" },
    { label: "Book Slot", href: `/s/${slug}/book`, active: activeRoute === "book" },
    { label: "My Passes (/me)", href: `/me`, active: false },
    { label: "Stylists", href: `/s/${slug}#team`, active: false },
    { label: "About", href: `/s/${slug}#about`, active: false },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3 transition-all shadow-lg shadow-black/40">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* LEFT: Clean Brand Identity (Android friendly) */}
        <Link href={`/s/${slug}`} className="flex items-center gap-3 group min-w-0">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Scissors className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg text-white leading-tight truncate group-hover:text-amber-400 transition-colors">
                {salon?.name || "Salon Storefront"}
              </h1>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shrink-0" title="Open Today" />
            </div>
            <p className="text-xs text-slate-400 truncate hidden sm:block">
              {salon?.tagline || "Digital Storefront & Live Queue"}
            </p>
          </div>
        </Link>

        {/* MIDDLE: Flat, clean text links on the same level (No box, no pills) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navMenuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`transition-colors py-1 ${
                item.active
                  ? "text-amber-400 font-bold border-b-2 border-amber-400"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT: Primary Action & Quick Links */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Book Appointment CTA Button */}
          {activeRoute !== "book" && (
            <Link
              href={`/s/${slug}/book`}
              className="min-h-[44px] px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs sm:text-sm rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Calendar className="h-4 w-4 text-amber-400" />
              <span className="hidden sm:inline">Book Slot</span>
            </Link>
          )}

          {/* Join Queue CTA Button */}
          {activeRoute !== "queue" && (
            <Link
              href={`/s/${slug}/queue`}
              className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Zap className="h-4 w-4 fill-slate-950" />
              <span>Join Queue</span>
            </Link>
          )}

          {/* Lobby TV Link */}
          <Link
            href={`/s/${slug}/tv`}
            target="_blank"
            className="min-h-[44px] px-3 py-2 text-xs text-slate-300 hover:text-white hidden lg:flex items-center gap-1.5 font-semibold bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/80 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
            <span>TV</span>
          </Link>

          {/* User Account / Sign In */}
          {user ? (
            <Link
              href="/me"
              className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-colors"
            >
              <UserIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{user.fullName || user.username}</span>
            </Link>
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(`/s/${slug}`)}&salon=${encodeURIComponent(slug)}`}
              className="min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700 hidden sm:flex items-center transition-colors"
            >
              Sign In
            </Link>
          )}

          {/* Mobile Hamburger Toggle (minimum 48px touch target for Android) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden h-11 w-11 p-0 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* MOBILE DRAWER (Optimized for Android smartphones: large touch targets, 0 overflow) */}
      {isMobileMenuOpen && (
        <div className="md:hidden pt-4 pb-3 border-t border-slate-800 mt-3 space-y-3 animate-in slide-in-from-top-2">
          <nav className="flex flex-col space-y-1">
            {navMenuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`min-h-[48px] px-4 py-3 rounded-xl flex items-center text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Link
                href={`/s/${slug}/book`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 min-h-[48px] bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Calendar className="h-4 w-4 text-amber-400" />
                <span>Book Guaranteed Slot</span>
              </Link>

              {activeRoute !== "queue" && (
                <Link
                  href={`/s/${slug}/queue`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
                >
                  <Zap className="h-4 w-4 fill-slate-950" />
                  <span>Join Queue</span>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/me"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 min-h-[48px] px-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-amber-400 flex items-center justify-center gap-2 font-bold"
              >
                <Ticket className="h-4 w-4" />
                <span>My Passes &amp; Tickets (/me)</span>
              </Link>

              <Link
                href={`/s/${slug}/tv`}
                target="_blank"
                onClick={() => setIsMobileMenuOpen(false)}
                className="min-h-[48px] px-4 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center justify-center gap-1.5 font-semibold"
              >
                <ExternalLink className="h-4 w-4 text-blue-400" />
                <span>TV</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
