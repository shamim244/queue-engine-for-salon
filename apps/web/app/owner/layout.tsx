"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Salon } from "@/lib/api";
import {
  Scissors,
  LayoutDashboard,
  Users,
  Tag,
  Printer,
  ChevronDown,
  LogOut,
  Sparkles,
  ExternalLink,
  Store,
  Armchair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function OwnerLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, salon, setSelectedSalon, logout, demoLogin } = useAuth();

  const [salonsList, setSalonsList] = useState<Salon[]>([]);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  // Fetch available salons for the multi-branch dropdown
  useEffect(() => {
    api.salons.getAll().then((data) => {
      setSalonsList(data || []);
      const paramSlug = searchParams.get("salon");
      if (paramSlug && (!salon || salon.slug !== paramSlug)) {
        const found = data.find((s) => s.slug === paramSlug || s.id === paramSlug);
        if (found) setSelectedSalon(found);
      } else if (!salon && data.length > 0) {
        setSelectedSalon(data[0]);
      }
    });
  }, [searchParams, salon, setSelectedSalon]);

  const currentSlug = salon?.slug || "salon-rural-01";

  const navLinks = [
    { label: "Dashboard", href: `/owner?salon=${currentSlug}`, icon: LayoutDashboard },
    { label: "Staff & PINs", href: `/owner/staff?salon=${currentSlug}`, icon: Users },
    { label: "Services & Pricing", href: `/owner/services?salon=${currentSlug}`, icon: Tag },
    { label: "Print Posters & QR", href: `/owner/links?salon=${currentSlug}`, icon: Printer },
  ];

  const handleBranchSelect = (s: Salon) => {
    setSelectedSalon(s);
    setIsBranchDropdownOpen(false);
    router.push(`${pathname}?salon=${s.slug}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      {/* Top Bar with Multi-Branch Switcher */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <Link href={`/owner?salon=${currentSlug}`} className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center font-bold text-white shadow-md shadow-amber-500/20">
                <Scissors className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-base text-white leading-none block">
                  Salon Owner Hub
                </span>
                <span className="text-[11px] text-slate-400">Command & Operations</span>
              </div>
            </Link>

            {/* Multi-Branch Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-white transition-all shadow-sm"
              >
                <Store className="h-3.5 w-3.5 text-amber-400" />
                <span className="max-w-[140px] truncate">{salon?.name || "Select Branch"}</span>
                <Badge
                  variant={salon?.operatingMode === "RURAL_SOLO" ? "warning" : "default"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {salon?.operatingMode === "RURAL_SOLO" ? "Solo" : "Multi"}
                </Badge>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isBranchDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 p-2 space-y-1">
                  <div className="px-3 py-2 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-800/80">
                    Switch Active Branch
                  </div>
                  {salonsList.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleBranchSelect(s)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        salon?.id === s.id
                          ? "bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div className="truncate">
                        <p className="truncate text-white font-medium">{s.name}</p>
                        <p className="text-[10px] text-slate-400">/s/{s.slug}</p>
                      </div>
                      <Badge
                        variant={s.operatingMode === "RURAL_SOLO" ? "warning" : "default"}
                        className="text-[9px]"
                      >
                        {s.operatingMode === "RURAL_SOLO" ? "Solo" : "Multi"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Launch & Session Controls */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <Link
              href={`/s/${currentSlug}/station`}
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Armchair className="h-3.5 w-3.5" />
              <span>Launch Chair UI</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-xs text-slate-400 hover:text-rose-400 gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => demoLogin("SALON_OWNER")}
                className="text-xs border-dashed gap-1"
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                Owner Demo Auth
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href.split("?")[0];
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
                  isActive
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          Loading Salon Hub...
        </div>
      }
    >
      <OwnerLayoutContent>{children}</OwnerLayoutContent>
    </Suspense>
  );
}
