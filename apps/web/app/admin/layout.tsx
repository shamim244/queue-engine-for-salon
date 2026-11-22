"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Radio,
  LogOut,
  LogIn,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Settings,
  Palette,
  Cpu,
  ShieldCheck,
  Zap,
  Menu,
  X,
  Crown,
  Wallet,
  Clock,
  Sliders,
  TrendingUp,
  FileText,
  Tag,
  Share2,
  Award,
  Bell,
  ArrowUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Accordion state
  const isFinanceRoute =
    pathname?.startsWith("/admin/payments") ||
    pathname?.startsWith("/admin/plans") ||
    pathname?.startsWith("/admin/subscriptions") ||
    pathname?.startsWith("/admin/wallets") ||
    pathname?.startsWith("/admin/billing");

  const isGrowthRoute =
    pathname?.startsWith("/admin/coupons") ||
    pathname?.startsWith("/admin/referrals") ||
    pathname?.startsWith("/admin/partners") ||
    pathname?.startsWith("/admin/loyalty");

  const isCommsRoute = pathname?.startsWith("/admin/communications");

  const isSystemRoute =
    pathname?.startsWith("/admin/settings") ||
    pathname?.startsWith("/admin/security");

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    core: true,
    finance: true,
    paymentsNested: true,
    growth: isGrowthRoute,
    partnersNested: pathname?.startsWith("/admin/partners"),
    comms: isCommsRoute,
    system: isSystemRoute,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Keep finance, payments, and partner navigation open if navigating inside them
  useEffect(() => {
    if (isFinanceRoute) {
      setExpandedSections((prev) => ({ ...prev, finance: true, paymentsNested: true }));
    }
    if (isGrowthRoute) {
      setExpandedSections((prev) => ({
        ...prev,
        growth: true,
        ...(pathname?.startsWith("/admin/partners") ? { partnersNested: true } : {}),
      }));
    }
    if (isCommsRoute) {
      setExpandedSections((prev) => ({ ...prev, comms: true }));
    }
    if (isSystemRoute) {
      setExpandedSections((prev) => ({ ...prev, system: true }));
    }
  }, [pathname]);

  // Fetch pending manual approvals count
  const loadPendingCount = async () => {
    try {
      const res = await api.admin.getPendingPayments();
      if (res.success && res.orders) {
        setPendingApprovalsCount(res.orders.length);
      }
    } catch (err) {
      // ignore in layout
    }
  };

  useEffect(() => {
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 15000); // 15s refresh for live badge
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // If on admin login page, bypass layout shell and AuthGuard
  if (pathname?.includes("/login")) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    router.push("/hq/login");
  };

  // Determine dynamic top header title based on route
  const getHeaderTitle = () => {
    if (pathname === "/admin") return "System Overview & Analytics";
    if (pathname === "/admin/tenants") return "Tenant Salons & Organization Hub";
    if (pathname === "/admin/users") return "User Directory & Multi-Tenant RBAC";
    if (pathname === "/admin/onboarding") return "Direct Salon Onboarding Wizard";
    if (pathname?.startsWith("/admin/payments/approvals")) return "Manual Payment Approvals Queue";
    if (pathname?.startsWith("/admin/payments/settings")) return "Payment Gateway Switchboard";
    if (pathname?.startsWith("/admin/payments/transactions")) return "Universal Transactions & Settlements";
    if (pathname?.startsWith("/admin/payments/analytics")) return "Revenue & Conversion Analytics";
    if (pathname?.startsWith("/admin/payments/audit")) return "Gateway & Payment Audit Trail";
    if (pathname?.startsWith("/admin/payments")) return "Payments & Gateway Command Center";
    if (pathname?.startsWith("/admin/plans")) return "Subscription Plans Studio & Dynamic Calibrator";
    if (pathname?.startsWith("/admin/subscriptions")) return "Tenant Salon Subscriptions & Quota Gates";
    if (pathname?.startsWith("/admin/wallets")) return "Salon Wallets & Double-Entry Passbook";
    if (pathname === "/admin/coupons") return "Promotional Coupon & Discount Engine";
    if (pathname === "/admin/referrals") return "Referral & Commission Program";
    if (pathname === "/admin/partners/new") return "Onboard New Partner (Instant Activation)";
    if (pathname === "/admin/partners") return "Partner Directory & Governance";
    if (pathname?.startsWith("/admin/partners/marketing")) return "Partner Marketing Kit CMS";
    if (pathname?.startsWith("/admin/partners/attributions")) return "Partner Salon Attributions & Milestones";
    if (pathname?.startsWith("/admin/partners/payouts")) return "Partner Withdrawals & Payout Desk";
    if (pathname?.startsWith("/admin/partners/settings")) return "Partner Program Settings & Commission Rules";
    if (pathname?.startsWith("/admin/partners")) return "Partner & Affiliate Command Suite";
    if (pathname?.startsWith("/admin/loyalty")) return "Digital Loyalty Stamp Cards & Tier Rewards";
    if (pathname?.startsWith("/admin/communications")) return "Communications Hub (WhatsApp & SMS)";
    if (pathname?.startsWith("/admin/settings")) return "Platform Configuration & Engine Settings";
    if (pathname?.startsWith("/admin/security")) return "Security, Access Control & Audit Log";
    return "SaaS Administration HQ";
  };

  const renderNavContent = (onItemClick?: () => void) => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Brand Header matching reference screenshot */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <Link href="/admin" onClick={onItemClick} className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform shrink-0">
              <Crown className="h-5 w-5 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <h1 className="font-black text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
                SaaS Admin
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Queue Engine HQ</p>
            </div>
          </Link>

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

        {/* Bun Core Live Heartbeat indicator */}
        <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold font-mono text-[11px]">Bun Core :3001</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
        </div>

        {/* Accordion Navigation */}
        <nav className="space-y-2 text-xs select-none">
          {/* SECTION 1: Core Operations */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => toggleSection("core")}
              className="w-full flex items-center justify-between px-2.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-xl transition-colors font-semibold"
            >
              <div className="flex items-center gap-2 text-slate-200">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="tracking-wide">Core Operations</span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  expandedSections.core ? "rotate-180" : ""
                }`}
              />
            </button>

            {expandedSections.core && (
              <div className="pl-6 space-y-0.5 border-l border-slate-800 ml-4 py-0.5 animate-in fade-in duration-150">
                {[
                  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
                  { label: "Tenant Salons", href: "/admin/tenants", icon: Building2 },
                  { label: "User Directory", href: "/admin/users", icon: Users },
                  { label: "Onboard Salon", href: "/admin/onboarding", icon: Sparkles },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onItemClick}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-all ${
                        isActive
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="h-3 w-3 shrink-0 opacity-80" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: Finance & Gateways (Matching reference screenshot) */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => toggleSection("finance")}
              className="w-full flex items-center justify-between px-2.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-xl transition-colors font-semibold"
            >
              <div className="flex items-center gap-2 text-slate-200">
                <CreditCard className="h-4 w-4 text-blue-400" />
                <span className="tracking-wide">Finance & Gateways</span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  expandedSections.finance ? "rotate-180" : ""
                }`}
              />
            </button>

            {expandedSections.finance && (
              <div className="pl-4 space-y-1 border-l border-slate-800 ml-4 py-0.5 animate-in fade-in duration-150">
                {/* 1. Salon Wallets */}
                <Link
                  href="/admin/wallets"
                  onClick={onItemClick}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-all ${
                    pathname === "/admin/wallets"
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Wallet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Salon Wallets</span>
                  </div>
                  {pathname === "/admin/wallets" && <ChevronRight className="h-3 w-3 shrink-0 opacity-80" />}
                </Link>

                {/* 2. Payments & Gateway (Nested Accordion) */}
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => toggleSection("paymentsNested")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      pathname?.startsWith("/admin/payments")
                        ? "bg-slate-800/90 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CreditCard className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Payments & Gateway</span>
                    </div>
                    <ChevronDown
                      className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                        expandedSections.paymentsNested ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expandedSections.paymentsNested && (
                    <div className="pl-4 space-y-0.5 border-l border-slate-800/80 ml-3 py-0.5 animate-in fade-in duration-150">
                      {[
                        { label: "All Transactions", href: "/admin/payments/transactions", icon: FileText },
                        {
                          label: "Manual Approvals",
                          href: "/admin/payments/approvals",
                          icon: Clock,
                          badge: pendingApprovalsCount,
                        },
                        { label: "Revenue Analytics", href: "/admin/payments/analytics", icon: TrendingUp },
                        { label: "Audit Trail", href: "/admin/payments/audit", icon: ShieldCheck },
                        { label: "Gateway Settings", href: "/admin/payments/settings", icon: Sliders },
                      ].map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={onItemClick}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              isSubActive
                                ? "bg-blue-600 text-white font-bold shadow-sm"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <SubIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{subItem.label}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {typeof subItem.badge === "number" && subItem.badge > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500 text-slate-950 animate-pulse">
                                  {subItem.badge}
                                </span>
                              )}
                              {isSubActive && <ChevronRight className="h-2.5 w-2.5 opacity-80" />}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Subscription Plans */}
                <Link
                  href="/admin/plans"
                  onClick={onItemClick}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-all ${
                    pathname === "/admin/plans"
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                    <span className="truncate">Subscription Plans</span>
                  </div>
                  {pathname === "/admin/plans" && <ChevronRight className="h-3 w-3 shrink-0 opacity-80" />}
                </Link>

                {/* 4. Salon Subscriptions */}
                <Link
                  href="/admin/subscriptions"
                  onClick={onItemClick}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-all ${
                    pathname === "/admin/subscriptions"
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Users className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">Salon Subscriptions</span>
                  </div>
                  {pathname === "/admin/subscriptions" && <ChevronRight className="h-3 w-3 shrink-0 opacity-80" />}
                </Link>
              </div>
            )}
          </div>

          {/* SECTION 3: Growth & Marketing */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => toggleSection("growth")}
              className="w-full flex items-center justify-between px-2.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-xl transition-colors font-semibold"
            >
              <div className="flex items-center gap-2 text-slate-200">
                <Tag className="h-4 w-4 text-pink-400" />
                <span className="tracking-wide">Growth & Marketing</span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  expandedSections.growth ? "rotate-180" : ""
                }`}
              />
            </button>

            {expandedSections.growth && (
              <div className="pl-6 space-y-1 border-l border-slate-800 ml-4 py-0.5 animate-in fade-in duration-150">
                {/* 1. Nested Partner Program Hub */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleSection("partnersNested")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      pathname?.startsWith("/admin/partners")
                        ? "text-blue-400 bg-blue-500/10 font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Users className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Partner Program</span>
                    </div>
                    <ChevronDown
                      className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                        expandedSections.partnersNested ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expandedSections.partnersNested && (
                    <div className="pl-4 space-y-0.5 border-l border-slate-800/80 ml-3 py-0.5 animate-in fade-in duration-150">
                      {[
                        { label: "Partner Directory", href: "/admin/partners", icon: Users, exact: true },
                        { label: "Marketing Kit CMS", href: "/admin/partners/marketing", icon: Sparkles },
                        { label: "Salon Attributions", href: "/admin/partners/attributions", icon: Building2 },
                        { label: "Withdrawals & Payouts", href: "/admin/partners/payouts", icon: Wallet },
                        { label: "Program Settings & Rules", href: "/admin/partners/settings", icon: Sliders },
                      ].map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = subItem.exact
                          ? pathname === subItem.href
                          : pathname?.startsWith(subItem.href);
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={onItemClick}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              isSubActive
                                ? "bg-blue-600 text-white font-bold shadow-sm"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <SubIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{subItem.label}</span>
                            </div>
                            {isSubActive && <ChevronRight className="h-2.5 w-2.5 opacity-80" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Coupon Codes */}
                <Link
                  href="/admin/coupons"
                  onClick={onItemClick}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-all ${
                    pathname === "/admin/coupons"
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Tag className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                    <span className="truncate">Coupon Codes</span>
                  </div>
                  {pathname === "/admin/coupons" && <ChevronRight className="h-3 w-3 shrink-0 opacity-80" />}
                </Link>

                {/* 3. Referrals & Commission */}
                <Link
                  href="/admin/referrals"
                  onClick={onItemClick}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-all ${
                    pathname === "/admin/referrals"
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Share2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">Referrals & Commission</span>
                  </div>
                  {pathname === "/admin/referrals" && <ChevronRight className="h-3 w-3 shrink-0 opacity-80" />}
                </Link>

                {/* 4. Loyalty Stamp Cards */}
                <Link
                  href="/admin/loyalty"
                  onClick={onItemClick}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-all ${
                    pathname === "/admin/loyalty"
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Award className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Loyalty Stamp Cards</span>
                  </div>
                  {pathname === "/admin/loyalty" && <ChevronRight className="h-3 w-3 shrink-0 opacity-80" />}
                </Link>
              </div>
            )}
          </div>

          {/* SECTION 4: Communications Hub */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => toggleSection("comms")}
              className="w-full flex items-center justify-between px-2.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-xl transition-colors font-semibold"
            >
              <div className="flex items-center gap-2 text-slate-200">
                <Bell className="h-4 w-4 text-yellow-400" />
                <span className="tracking-wide">Communications Hub</span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  expandedSections.comms ? "rotate-180" : ""
                }`}
              />
            </button>

            {expandedSections.comms && (
              <div className="pl-6 space-y-0.5 border-l border-slate-800 ml-4 py-0.5 animate-in fade-in duration-150">
                <Link
                  href="/admin/communications"
                  onClick={onItemClick}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-all ${
                    pathname === "/admin/communications"
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Radio className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                    <span className="truncate">WhatsApp & SMS</span>
                  </div>
                  {pathname === "/admin/communications" && <ChevronRight className="h-3 w-3 shrink-0 opacity-80" />}
                </Link>
              </div>
            )}
          </div>

          {/* SECTION 5: System & DevOps */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => toggleSection("system")}
              className="w-full flex items-center justify-between px-2.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-xl transition-colors font-semibold"
            >
              <div className="flex items-center gap-2 text-slate-200">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                <span className="tracking-wide">System & DevOps</span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  expandedSections.system ? "rotate-180" : ""
                }`}
              />
            </button>

            {expandedSections.system && (
              <div className="pl-6 space-y-0.5 border-l border-slate-800 ml-4 py-0.5 animate-in fade-in duration-150">
                {[
                  { label: "General Settings", href: "/admin/settings", icon: Settings },
                  { label: "Compression & Cache", href: "/admin/settings/compression", icon: Zap },
                  { label: "Appearance & Themes", href: "/admin/settings/appearance", icon: Palette },
                  { label: "Engine & Gateways", href: "/admin/settings/system", icon: Cpu },
                  { label: "Security & Audit", href: "/admin/security", icon: ShieldCheck },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onItemClick}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-all ${
                        isActive
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="h-3 w-3 shrink-0 opacity-80" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Footer Auth Control */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3">
        {user ? (
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-white truncate">
                {user.username || "Super Administrator"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="purple" className="text-[9px] px-1.5 py-0 font-mono tracking-wider">
                  {user.role}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
              className="shrink-0 h-7 w-7 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Link href="/hq/login?redirect=/admin" onClick={onItemClick} className="w-full block">
            <Button
              variant="outline"
              className="w-full text-xs gap-1.5 border-purple-500/30 hover:bg-purple-950/40 text-purple-200"
            >
              <LogIn className="h-3.5 w-3.5 text-purple-400" />
              Sign In to Platform HQ
            </Button>
          </Link>
        )}

        <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
          <div className="flex items-center gap-2">
            <Link href="/" onClick={onItemClick} className="hover:text-blue-400 transition-colors">
              Home
            </Link>
            <span>•</span>
            <Link href="/dev" onClick={onItemClick} className="hover:text-blue-400 transition-colors">
              Dev Hub
            </Link>
          </div>
          <span className="font-mono">v1.4.3</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* 1. Mobile Top Navbar */}
      <div className="md:hidden border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md">
            <Crown className="h-4 w-4 fill-amber-300 text-amber-300" />
          </div>
          <div>
            <span className="font-bold text-sm text-white block leading-tight flex items-center gap-1.5">
              SaaS Admin
              <Badge variant="purple" className="text-[9px] px-1 py-0">HQ</Badge>
            </span>
            <span className="text-[10px] text-slate-400">Queue Engine Platform</span>
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

      {/* 2. Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="relative w-72 max-w-[85vw] h-full bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between z-10 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200"
            tabIndex={-1}
            aria-label="Mobile Navigation"
          >
            {renderNavContent(() => setIsMobileMenuOpen(false))}
          </aside>
        </div>
      )}

      {/* 3. Desktop Permanent Sidebar matching Reference Screenshot */}
      <aside className="hidden md:flex md:w-64 border-r border-slate-800/90 bg-slate-950/80 p-4 flex-col justify-between shrink-0 md:min-h-screen sticky md:top-0 z-30 overflow-y-auto">
        {renderNavContent()}
      </aside>

      {/* 4. Main Content Area with Top Header Bar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar matching reference screenshot */}
        <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {getHeaderTitle()}
            </h2>
          </div>

          {/* Right Switcher Pills matching reference screenshot */}
          <div className="flex items-center gap-2">
            {/* Dashboard Pill */}
            <Link href="/admin">
              <button
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  pathname === "/admin"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800"
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            </Link>

            {/* Salon / User Panel Pill */}
            <Link href="/owner" target="_blank">
              <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all">
                <Users className="h-3.5 w-3.5 text-purple-400" />
                <span className="hidden sm:inline">Salon Panel</span>
                <ArrowUpRight className="h-3 w-3 text-slate-500" />
              </button>
            </Link>

            {/* Super Admin Pill */}
            <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/40 text-purple-200 flex items-center gap-1.5 shadow-sm">
              <Crown className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              <span>Super Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl">
          <AuthGuard requiredRole="SUPER_ADMIN">
            {children}
          </AuthGuard>
        </main>
      </div>
    </div>
  );
}