"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  partnerApi,
  getStoredPartnerToken,
  getStoredPartner,
} from "@/lib/partner-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  UserPlus,
  Store,
  Wallet,
  FileText,
  Bell,
  LogOut,
  User,
  CheckCircle2,
  ChevronRight,
  X,
  CreditCard,
  Menu,
  Copy,
  Check,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Radio,
} from "lucide-react";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Skip auth layout on public pages: /partner/join and /partner/login
  const isPublicPage = pathname === "/partner/join" || pathname === "/partner/login";

  const [partner, setPartner] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchPartnerData = async () => {
    try {
      const res = await partnerApi.getMe();
      if (res.success) {
        setPartner(res.partner);
        setWallet(res.wallet);
      }
      const notifRes = await partnerApi.getNotifications();
      if (notifRes.success) {
        setNotifications(notifRes.notifications);
      }
    } catch {
      // Fallback to stored partner
      const stored = getStoredPartner();
      if (stored) setPartner(stored);
    }
  };

  useEffect(() => {
    if (isPublicPage) return;
    const token = getStoredPartnerToken();
    if (!token) {
      router.push("/partner/login");
      return;
    }
    fetchPartnerData();
  }, [pathname, isPublicPage, router]);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowNotifications(false);
  }, [pathname]);

  const handleLogout = () => {
    partnerApi.logout();
    router.push("/partner/login");
  };

  const handleMarkRead = async (id: string) => {
    await partnerApi.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleCopyReferralCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!partner?.referralCode) return;
    navigator.clipboard.writeText(partner.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (isPublicPage) {
    return <>{children}</>;
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getHeaderTitle = () => {
    if (pathname === "/partner") return "Partner Performance Cockpit & KPIs";
    if (pathname?.startsWith("/partner/onboard")) return "Assisted In-Shop Onboarding Wizard";
    if (pathname?.startsWith("/partner/salons")) return "Referred Salons & Milestone Progress";
    if (pathname?.startsWith("/partner/wallet")) return "Earnings Passbook & Payout Disbursals";
    if (pathname?.startsWith("/partner/marketing")) return "Marketing Pitch Kit & Counter Standees";
    if (pathname?.startsWith("/partner/profile")) return "Partner Profile & Payout Banking Details";
    return "Partner Affiliate Command HQ";
  };

  const navItems = [
    {
      href: "/partner",
      label: "Dashboard",
      icon: LayoutDashboard,
      description: "Overview & Analytics",
    },
    {
      href: "/partner/onboard",
      label: "Assisted Onboard",
      icon: UserPlus,
      description: "Door-to-door Wizard",
      badge: "2-Min",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    {
      href: "/partner/salons",
      label: "Referred Salons",
      icon: Store,
      description: "Milestones & Roster",
    },
    {
      href: "/partner/wallet",
      label: "Wallet & Payout",
      icon: Wallet,
      description: "Passbook & Withdrawals",
      badge: wallet?.availableBalance ? `₹${wallet.availableBalance}` : undefined,
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    {
      href: "/partner/marketing",
      label: "Pitch Kit CMS",
      icon: FileText,
      description: "Scripts & WhatsApp",
    },
    {
      href: "/partner/profile",
      label: "Bank & Profile",
      icon: User,
      description: "UPI & Bank Accounts",
    },
  ];

  // Reusable Sidebar Navigation Content (Shared across Desktop & Mobile Slide-over Drawer)
  const renderNavContent = (onItemClick?: () => void) => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <Link href="/partner" onClick={onItemClick} className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
              EQ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-white text-base">
                  Engine<span className="text-amber-400">Que</span>
                </span>
                <Badge variant="warning" className="text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold">
                  Partner
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Growth & Affiliate HQ</p>
            </div>
          </Link>

          {onItemClick && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 hover:text-white md:hidden"
              onClick={onItemClick}
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Live Partner Status & Referral Code Card */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{partner?.persona ? partner.persona.replace("_", " ") : "AFFILIATE"}</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {partner?.status || "ACTIVE"}
            </span>
          </div>

          {partner?.referralCode && (
            <div
              onClick={handleCopyReferralCode}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors group"
              title="Click to copy your unique referral promo code"
            >
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                  Promo Code
                </span>
                <span className="font-mono font-bold text-xs text-amber-300 tracking-wide">
                  {partner.referralCode}
                </span>
              </div>
              <div className="text-slate-400 group-hover:text-amber-400 transition-colors">
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Wallet Micro-Widget */}
        <Link href="/partner/wallet" onClick={onItemClick}>
          <div className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900/60 border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex items-center justify-between group cursor-pointer shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">Available Balance</p>
                <p className="text-sm font-extrabold text-emerald-400 leading-tight">
                  ₹{wallet?.availableBalance ?? 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              <span className="font-semibold hidden lg:inline">Payout</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>

        {/* Vertical Navigation Links */}
        <nav className="space-y-1 text-xs select-none pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold shadow-sm shadow-amber-500/5"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor || "bg-slate-800 text-slate-300 border-slate-700"}`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400/80" />}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Partner Identity & Logout Card */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <Link href="/partner/profile" onClick={onItemClick} className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
              {partner?.fullName ? partner.fullName.charAt(0).toUpperCase() : "P"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate leading-tight">
                {partner?.fullName || "Partner Account"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {partner?.phone || partner?.email || "View Profile & Bank"}
              </p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg shrink-0 ml-1 transition-colors"
            title="Log out of Partner Portal"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
          <span>EngineQue Partner v2.4</span>
          <span className="flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            Live Sync
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* 1. Mobile Top Navbar with 3-line Hamburger & Quick Profile Access */}
      <header className="md:hidden border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {/* 3-Line Hamburger Menu Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0 border-slate-700 bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open partner navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Brand Logo link */}
          <Link href="/partner" className="flex items-center gap-2 ml-1">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-black text-slate-950 text-xs shadow-md shadow-amber-500/20">
              EQ
            </div>
            <div>
              <span className="font-extrabold text-sm text-white block leading-tight">
                Engine<span className="text-amber-400">Que</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Partner HQ</span>
            </div>
          </Link>
        </div>

        {/* Mobile Header Right Controls: Wallet, Notification Bell, Profile Icon */}
        <div className="flex items-center gap-2">
          {/* Mobile Live Wallet Pill */}
          <Link href="/partner/wallet">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors cursor-pointer">
              <CreditCard className="w-3.5 h-3.5" />
              <span>₹{wallet?.availableBalance ?? 0}</span>
            </div>
          </Link>

          {/* Mobile Notifications Bell Button */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="h-9 w-9 p-0 rounded-full border-slate-700 bg-slate-800/90 text-slate-300 hover:text-white relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* Mobile Notifications Dropdown Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Notifications</span>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkRead(n.id)}
                        className={`p-3 text-left text-xs hover:bg-slate-800/50 cursor-pointer ${
                          !n.isRead ? "bg-amber-500/5" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-200">{n.title}</span>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Profile Icon Avatar */}
          <Link href="/partner/profile">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-full border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              title="Profile & Bank Settings"
              aria-label="Profile"
            >
              <User className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. Mobile Slide-Over Drawer (Enterprise Grade with Backdrop Blur) */}
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
            aria-label="Mobile Navigation Drawer"
          >
            {renderNavContent(() => setIsMobileMenuOpen(false))}
          </aside>
        </div>
      )}

      {/* 3. Desktop Permanent Sidebar matching Enterprise Admin/Owner Standard */}
      <aside className="hidden md:flex md:w-64 lg:w-72 border-r border-slate-800/90 bg-slate-950/80 backdrop-blur-xl p-4 flex-col justify-between shrink-0 md:min-h-screen sticky md:top-0 z-30 overflow-y-auto">
        {renderNavContent()}
      </aside>

      {/* 4. Main Content Area with Desktop Top Header Bar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Sticky Header Bar */}
        <header className="hidden md:flex border-b border-slate-800/80 bg-slate-950/70 backdrop-blur px-6 lg:px-8 py-3.5 items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base lg:text-lg font-bold text-white tracking-tight">
              {getHeaderTitle()}
            </h2>
          </div>

          {/* Desktop Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Quick Action: Assisted Onboard */}
            <Link href="/partner/onboard">
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Onboard Salon</span>
              </Button>
            </Link>

            {/* Desktop Wallet Balance Pill */}
            <Link href="/partner/wallet">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors shadow-sm cursor-pointer">
                <CreditCard className="w-3.5 h-3.5" />
                <span>₹{wallet?.availableBalance ?? 0}</span>
                <span className="text-[10px] text-emerald-500 font-normal hidden lg:inline">
                  Available
                </span>
              </div>
            </Link>

            {/* Desktop Notifications Bell Button & Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center relative transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shadow">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <Badge variant="warning" className="text-[10px]">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkRead(n.id)}
                          className={`p-3.5 text-left text-xs transition-colors cursor-pointer hover:bg-slate-800/50 ${
                            !n.isRead ? "bg-amber-500/5" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-200">{n.title}</span>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px] leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Profile Link Avatar */}
            <Link href="/partner/profile">
              <button
                type="button"
                className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center text-xs font-bold hover:bg-amber-500/25 transition-colors shadow-sm"
                title="Profile & Bank Settings"
              >
                <User className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-12">
          {children}
        </main>
      </div>

      {/* 5. Mobile Bottom Navigation Dock (Android Mobile-First Core Mandate) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 flex items-center justify-around py-1.5 px-2">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all min-h-[48px] min-w-[54px] ${
                isActive
                  ? "text-amber-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
