"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { api } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { triggerHaptic } from "@/lib/haptics";
import {
  Armchair,
  Tv,
  LogOut,
  Scissors,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  User as UserIcon,
  Settings,
  Coffee,
  Clock,
  Radio,
  Globe,
  IndianRupee,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, staff, salon, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dailyStats, setDailyStats] = useState<{ revenue: number; served: number } | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakTimer, setBreakTimer] = useState<number | null>(null);

  const effectiveSlug = salon?.slug || "ramesh-barber";
  const effectiveSalonId = salon?.id || "salon-rural-01";
  const stylistId = staff?.id || (user as any)?.staffId;

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

  // Fetch Daily Shift Performance for Sidebar Card
  useEffect(() => {
    if (!effectiveSalonId) return;
    api.queue.getStaffReport(effectiveSalonId, stylistId)
      .then((rep) => {
        if (rep && rep.success) {
          setDailyStats({
            revenue: rep.totalRevenueToday || 0,
            served: rep.totalServedToday || 0,
          });
        }
      })
      .catch(() => {});
  }, [effectiveSalonId, stylistId]);

  // WebSocket Live Sync for Shift Telemetry
  useSalonSocket(effectiveSalonId, () => {
    api.queue.getStaffReport(effectiveSalonId, stylistId)
      .then((rep) => {
        if (rep && rep.success) {
          setDailyStats({
            revenue: rep.totalRevenueToday || 0,
            served: rep.totalServedToday || 0,
          });
        }
      })
      .catch(() => {});
  });

  // Break countdown timer in client memory
  useEffect(() => {
    if (!isOnBreak || breakTimer === null || breakTimer <= 0) return;
    const interval = setInterval(() => {
      setBreakTimer((prev) => (prev && prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOnBreak, breakTimer]);

  const handleToggleBreak = async () => {
    triggerHaptic("tap");
    const next = !isOnBreak;
    setIsOnBreak(next);
    if (next) {
      setBreakTimer(600); // 10 minutes
    } else {
      setBreakTimer(null);
    }
    if (stylistId) {
      api.auth.updateStaffPreference({
        staffId: stylistId,
        isActive: !next,
      }).catch(() => {});
    }
  };

  const formatBreakTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const displayName = staff?.name || user?.fullName || user?.username || "Master Stylist";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const staffNavItems = [
    {
      label: "My Chair & Queue",
      href: "/staff",
      icon: Armchair,
      active: pathname === "/staff",
    },
    {
      label: "Shift Analytics",
      href: "/staff/analytics",
      icon: BarChart3,
      active: pathname === "/staff/analytics",
    },
    {
      label: "Mirror Tablet Station",
      href: `/s/${effectiveSlug}/station`,
      icon: Tv,
      active: pathname.includes("/station"),
    },
    {
      label: "General Settings",
      href: "/staff/preferences",
      icon: Settings,
      active: pathname === "/staff/preferences",
    },
  ];

  const quickTools = [
    {
      label: "Lounge TV Board",
      href: `/s/${effectiveSlug}/tv`,
      icon: Tv,
      external: true,
      color: "text-blue-400",
    },
    {
      label: "Client Storefront",
      href: `/s/${effectiveSlug}`,
      icon: Globe,
      external: true,
      color: "text-purple-400",
    },
  ];

  // Common Sidebar Body Component used in both Desktop Sidebar and Mobile Drawer
  const renderSidebarContent = (isDrawer = false) => (
    <div className="flex flex-col justify-between h-full space-y-5">
      <div className="space-y-5 overflow-y-auto pr-1">
        {/* 1. Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Scissors className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-white text-sm truncate">Staff Station</h2>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[10px] text-emerald-400 font-semibold truncate">Live Synced</span>
              </div>
            </div>
          </div>

          {isDrawer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 2. Assigned Branch Card */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned Branch</span>
          <p className="text-xs font-bold text-white truncate">{salon?.name || "Ramesh Traditional Barber"}</p>
          <p className="text-[10px] text-slate-400">Station / Chair #1</p>
        </div>

        {/* 3. Shift Status & 10-Minute Chai Break Controller */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Working Status
            </span>
            <Badge
              className={`text-[10px] px-2 py-0.5 font-bold ${
                isOnBreak
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              }`}
            >
              {isOnBreak ? `Break (${formatBreakTime(breakTimer || 0)})` : "On Duty"}
            </Badge>
          </div>

          <button
            type="button"
            onClick={handleToggleBreak}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm ${
              isOnBreak
                ? "bg-amber-500 text-slate-950 font-black shadow-amber-500/25"
                : "border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            <Coffee className="h-3.5 w-3.5" />
            <span>{isOnBreak ? "Resume Duty (End Break)" : "10-Min Chai Break"}</span>
          </button>
        </div>

        {/* 4. Today's Performance Mini-Card */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Today&apos;s Shift Billing
          </span>
          <div className="flex items-center justify-between">
            <div className="text-base font-black text-emerald-400 font-mono flex items-center">
              <IndianRupee className="h-4 w-4" />
              <span>{dailyStats ? dailyStats.revenue : 0}</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {dailyStats ? dailyStats.served : 0} cuts served
            </span>
          </div>
        </div>

        {/* 5. Core Operational Navigation Links */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 px-2 block">
            Navigation
          </span>
          <nav className="space-y-1">
            {staffNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isDrawer && setIsMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                    item.active
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 6. Quick Utility & Launch Shortcuts */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 px-2 block">
            Quick Launch
          </span>
          <div className="space-y-1">
            {quickTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  target="_blank"
                  onClick={() => isDrawer && setIsMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-300 hover:bg-slate-800 hover:text-white transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${tool.color}`} />
                    <span className="truncate">{tool.label}</span>
                  </div>
                  <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-slate-300" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Bottom Stylist Profile Mini-Footer */}
      <div className="pt-3 border-t border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2.5 px-1">
          <div className="h-8 w-8 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-amber-400 truncate">
              Pace: ~{staff?.avgDurationMinutes || 25}m / cut
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            triggerHaptic("tap");
            try {
              await logout();
            } catch {}
            router.push("/salon/login?tab=staff");
          }}
          className="w-full text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl justify-start gap-2 h-9"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );

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
            <p className="text-[10px] text-amber-400 font-semibold">{displayName}</p>
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
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* 3. DESKTOP PERMANENT SIDEBAR (hidden md:flex) */}
      <aside className="hidden md:flex w-64 bg-slate-900/90 border-r border-slate-800/80 p-5 flex-col justify-between shrink-0 sticky top-0 h-screen">
        {renderSidebarContent(false)}
      </aside>

      {/* 4. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* 5. MOBILE BOTTOM THUMB BAR (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 py-2 flex items-center justify-around shadow-2xl safe-area-bottom">
        <Link
          href="/staff"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[48px] min-w-[64px] transition-colors ${
            pathname === "/staff"
              ? "text-amber-400 font-bold bg-amber-500/10"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Armchair className="h-5 w-5" />
          <span className="text-[10px] mt-1">My Chair</span>
        </Link>

        <Link
          href="/staff/analytics"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[48px] min-w-[64px] transition-colors ${
            pathname === "/staff/analytics"
              ? "text-amber-400 font-bold bg-amber-500/10"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          <span className="text-[10px] mt-1">Analytics</span>
        </Link>

        <Link
          href="/staff/preferences"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[48px] min-w-[64px] transition-colors ${
            pathname === "/staff/preferences"
              ? "text-amber-400 font-bold bg-amber-500/10"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] mt-1">Settings</span>
        </Link>

        <Link
          href={`/s/${effectiveSlug}/station`}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[48px] min-w-[64px] transition-colors ${
            pathname.includes("/station")
              ? "text-amber-400 font-bold bg-amber-500/10"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Tv className="h-5 w-5" />
          <span className="text-[10px] mt-1">Station</span>
        </Link>
      </nav>
    </div>
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.includes("/login")) {
    return <>{children}</>;
  }

  return (
    <AuthGuard requiredRole={["STAFF", "SALON_OWNER", "SUPER_ADMIN"]}>
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Staff Station...</div>}>
        <StaffLayoutContent>{children}</StaffLayoutContent>
      </Suspense>
    </AuthGuard>
  );
}
