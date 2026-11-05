"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import {
  Armchair,
  Sliders,
  Tv,
  LogOut,
  Scissors,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, staff, salon, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    if (isMobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const effectiveSlug = salon?.slug || "ramesh-barber";

  const staffNavItems = [
    {
      label: "My Chair & Queue",
      href: "/staff",
      icon: Armchair,
      active: pathname === "/staff",
    },
    {
      label: "Mirror Tablet Station",
      href: `/s/${effectiveSlug}/station`,
      icon: Tv,
      active: pathname.includes("/station"),
    },
    {
      label: "Preferences & PIN",
      href: "/staff/preferences",
      icon: Sliders,
      active: pathname === "/staff/preferences",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* 1. MOBILE TOP BAR (md:hidden) */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md">
            <Scissors className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white leading-tight">Staff Station</h1>
            <p className="text-[10px] text-amber-400 font-semibold">{staff?.name || user?.username || "Barber Desk"}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="h-10 w-10 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* 2. MOBILE SLIDE-OVER DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative flex-1 w-full max-w-xs bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-sm">Staff Station</h2>
                    <p className="text-[10px] text-slate-400">{salon?.name || "Salon Engine"}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation Links (Touch target >= 48px) */}
              <nav className="space-y-1.5">
                {staffNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`min-h-[48px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                        item.active
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Logout button */}
            <div className="pt-4 border-t border-slate-800">
              <Button
                variant="ghost"
                onClick={() => logout()}
                className="w-full min-h-[48px] text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl justify-start gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* 3. DESKTOP PERMANENT SIDEBAR (hidden md:flex) */}
      <aside className="hidden md:flex w-64 bg-slate-900/90 border-r border-slate-800/80 p-5 flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div className="space-y-6">
          {/* Brand header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Scissors className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-white text-sm truncate">Staff Station</h2>
              <p className="text-xs text-amber-400 font-semibold truncate">
                {staff?.name || user?.fullName || user?.username || "Master Stylist"}
              </p>
            </div>
          </div>

          {/* Salon Badge */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned Branch</span>
            <p className="text-xs font-bold text-white truncate">{salon?.name || "Ramesh Traditional Barber"}</p>
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Shift Active</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {staffNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                    item.active
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer profile & Sign out */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2.5 px-2">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.username}</p>
              <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 py-0">
                STAFF
              </Badge>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="w-full text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* 4. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole={["STAFF", "SALON_OWNER", "SUPER_ADMIN"]}>
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Staff Station...</div>}>
        <StaffLayoutContent>{children}</StaffLayoutContent>
      </Suspense>
    </AuthGuard>
  );
}
