"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { api } from "@/lib/api";
import type { Salon } from "@/lib/api";
import {
  Scissors,
  LayoutDashboard,
  Users,
  Tag,
  Printer,
  ChevronDown,
  LogOut,
  LogIn,
  Sparkles,
  ExternalLink,
  Store,
  Armchair,
  CreditCard,
  TicketPercent,
  Gift,
  Radio,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function OwnerLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, salon, setSelectedSalon, logout, demoLogin } = useAuth();

  // If on owner login page, bypass layout shell and AuthGuard to avoid redirect conflict
  if (pathname?.includes("/login")) {
    return <>{children}</>;
  }

  const [salonsList, setSalonsList] = useState<Salon[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Handle Escape key to close mobile drawer
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

  const currentSlug = salon?.slug || "ramesh-barber";

  const navSections = [
    {
      title: "OPERATIONS",
      items: [
        { label: "Dashboard", href: `/owner?salon=${currentSlug}`, icon: LayoutDashboard },
        { label: "Staff & Users", href: `/owner/staff?salon=${currentSlug}`, icon: Users },
        { label: "Services & Catalog", href: `/owner/services?salon=${currentSlug}`, icon: Tag },
      ],
    },
    {
      title: "GROWTH & MARKETING",
      items: [
        { label: "Storefront & Landing", href: `/owner/storefront?salon=${currentSlug}`, icon: Store },
        { label: "Coupon Codes", href: `/owner/coupons?salon=${currentSlug}`, icon: TicketPercent },
        { label: "Refer & Loyalty", href: `/owner/referrals?salon=${currentSlug}`, icon: Gift },
      ],
    },
    {
      title: "MONETIZATION",
      items: [
        { label: "Subscription & Tier", href: `/owner/billing?salon=${currentSlug}`, icon: CreditCard },
      ],
    },
    {
      title: "HARDWARE & POSTERS",
      items: [
        { label: "Print Mirror Posters", href: `/owner/links?salon=${currentSlug}`, icon: Printer },
      ],
    },
  ];

  const handleBranchSelect = (s: Salon) => {
    setSelectedSalon(s);
    router.push(`${pathname}?salon=${s.slug}`);
    setIsMobileMenuOpen(false);
  };

  const renderNavContent = (onItemClick?: () => void) => (
    <>
      <div className="space-y-6">
        {/* 1. Header with Salon Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-amber-500/20 shrink-0">
              <Scissors className="h-5 w-5" />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
                Salon Owner
                <Badge variant="warning" className="text-[10px] px-1.5 py-0">HUB</Badge>
              </h1>
              <p suppressHydrationWarning className="text-xs text-slate-400 truncate">{salon?.name || "Branch Manager"}</p>
            </div>
          </div>
          {onItemClick && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white md:hidden"
              onClick={onItemClick}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* 2. Multi-Branch Switcher in Sidebar Header */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Active Branch & Mode
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-slate-500 text-xs font-semibold text-white transition-all shadow-sm">
              <div className="flex items-center gap-2 truncate text-left">
                <Store className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span suppressHydrationWarning className="truncate">{salon?.name || "Select Branch"}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 border-slate-700 bg-slate-800 text-slate-300"
                >
                  {(salon?.stylists?.length || 1) === 1 ? "1 Chair" : `${salon?.stylists?.length || 1} Chairs`}
                </Badge>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 p-2 space-y-1">
              <DropdownMenuLabel>Switch Branch Location</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {salonsList.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => handleBranchSelect(s)}
                  className={`w-full justify-between cursor-pointer ${
                    salon?.id === s.id
                      ? "bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20"
                      : "text-slate-300"
                  }`}
                >
                  <div className="truncate text-left">
                    <p className="truncate text-white font-medium">{s.name}</p>
                    <p className="text-[10px] text-slate-400">/s/{s.slug}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] border-slate-700 bg-slate-800 text-slate-300"
                  >
                    {(s.stylists?.length || 1) === 1 ? "1 Chair" : `${s.stylists?.length || 1} Chairs`}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 3. Launch Chair Station Shortcut Button */}
        <Link
          href={`/s/${currentSlug}/station`}
          target="_blank"
          onClick={onItemClick}
          className="w-full px-3.5 py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center justify-between transition-colors shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Armchair className="h-4 w-4 text-blue-400" />
            <span>Launch Chair UI</span>
          </div>
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Link>

        {/* 4. Categorized Sidebar Navigation */}
        <nav className="space-y-5">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <div className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const pathOnly = item.href.split("?")[0];
                  const isActive = pathname === pathOnly;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onItemClick}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-75" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* 5. Footer: Telemetry & Session Management */}
      <div className="pt-6 border-t border-slate-800/80 space-y-3 mt-4">
        <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Bun Core 3001</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
        </div>

        {user ? (
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">
                {user.username || "Salon Owner"}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout" className="h-8 w-8">
              <LogOut className="h-4 w-4 text-slate-400 hover:text-rose-400" />
            </Button>
          </div>
        ) : (
          <Link href="/login?redirect=/owner" onClick={onItemClick} className="w-full block">
            <Button
              variant="outline"
              className="w-full text-xs gap-1.5 border-slate-700 hover:bg-slate-800 text-slate-200"
            >
              <LogIn className="h-3.5 w-3.5 text-amber-400" />
              Sign In to Salon Hub
            </Button>
          </Link>
        )}

        <div className="flex justify-between items-center text-[11px] text-slate-500 px-1 pt-1">
          <div className="flex items-center gap-2">
            <Link href="/" onClick={onItemClick} className="hover:text-amber-400 transition-colors">
              Home
            </Link>
            <span>•</span>
            <Link href="/dev" onClick={onItemClick} className="hover:text-amber-400 transition-colors">
              Dev Hub
            </Link>
          </div>
          <span>v1.4.3</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* 1. Mobile Top Navbar with 3-line Hamburger Menu */}
      <div className="md:hidden border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href={`/owner?salon=${currentSlug}`} className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center font-bold text-white shadow-md">
            <Scissors className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-white block leading-tight">Salon Owner Hub</span>
            <span suppressHydrationWarning className="text-[10px] text-slate-400">{salon?.name || "Loading..."}</span>
          </div>
        </Link>

        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0 border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open mobile navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* 2. Mobile Slide-Over Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="relative w-72 max-w-[85vw] h-full bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between z-10 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200"
            tabIndex={-1}
            aria-label="Mobile Navigation"
          >
            {renderNavContent(() => setIsMobileMenuOpen(false))}
          </aside>
        </div>
      )}

      {/* 3. Main Desktop Sidebar (Hidden on mobile) */}
      <aside className="hidden md:flex md:w-72 border-r border-slate-800 bg-slate-900/70 backdrop-blur-xl p-5 flex-col justify-between shrink-0 md:min-h-screen sticky md:top-0 z-30">
        {renderNavContent()}
      </aside>

      {/* 4. Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl">
        <AuthGuard requiredRole={["SUPER_ADMIN", "SALON_OWNER"]}>
          {children}
        </AuthGuard>
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
