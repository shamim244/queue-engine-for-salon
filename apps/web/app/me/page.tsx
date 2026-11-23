"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Ticket, Appointment, Coupon } from "@/lib/api";
import { RescheduleModal } from "@/components/booking/reschedule-modal";
import { useSalonSocket } from "@/lib/socket";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { AuthGuard } from "@/components/auth-guard";
import {
  User,
  Scissors,
  Receipt,
  Gift,
  Clock,
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
  CheckCircle2,
  Bookmark,
  Store,
  ChevronRight,
  LogOut,
  LogIn,
  QrCode,
  TicketPercent,
  Share2,
  Copy,
  Check,
  LayoutDashboard,
  Menu,
  X,
  ExternalLink,
  Volume2,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Award,
  Wallet,
  PartyPopper,
} from "lucide-react";

interface VisitHistoryItem {
  id: string;
  salonName: string;
  salonSlug: string;
  date: string;
  service: string;
  stylistName: string;
  amount: number;
  paymentMethod: "CASH" | "UPI";
  invoiceNumber: string;
}

interface CustomerLoyaltyCardData {
  id: string;
  salonId: string;
  salonName: string;
  salonSlug: string;
  currentStamps: number;
  stampGoal: number;
  totalLifetimeStamps: number;
  completedMilestones: number;
  rewardServiceName: string;
  rewardServicePrice: number;
  progressPercent: number;
  activeVouchers: Array<{
    id: string;
    voucherCode: string;
    salonId: string;
    rewardServiceId: string;
    rewardServiceName: string;
    rewardServicePrice: number;
    status: string;
    unlockedAt: string;
    expiresAt?: string | null;
  }>;
}

export default function CustomerAccountPage() {
  return (
    <AuthGuard requiredRole={["CUSTOMER", "SUPER_ADMIN", "SALON_OWNER", "STAFF"]}>
      <CustomerAccountContent />
    </AuthGuard>
  );
}

function CustomerAccountContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Active Sidebar Navigation Tab
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "loyalty" | "history" | "referrals">("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Live Active Queue Ticket for this Customer
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [realVisits, setRealVisits] = useState<VisitHistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Multi-Salon Loyalty Cards & Vouchers
  const [loyaltyCards, setLoyaltyCards] = useState<CustomerLoyaltyCardData[]>([]);
  const [totalActiveVouchers, setTotalActiveVouchers] = useState(0);

  // Consumer Wallet & Available Coupons
  const [consumerWalletBalance, setConsumerWalletBalance] = useState<number>(0);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  // Active Prepaid Appointments for this Customer
  const [appointments, setAppointments] = useState<
    (Appointment & { salonName: string; salonSlug: string; salonAddress?: string })[]
  >([]);
  const [reschedulingAppt, setReschedulingAppt] = useState<
    (Appointment & { salonName: string; salonSlug: string; salonAddress?: string }) | null
  >(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  // Grooming Profile State (real database-backed)
  const [preferredStylist, setPreferredStylist] = useState("");
  const [haircutSpecs, setHaircutSpecs] = useState("");
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [isSavingSpecs, setIsSavingSpecs] = useState(false);
  const [specsSaved, setSpecsSaved] = useState(false);

  // Digital Receipt Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<VisitHistoryItem | null>(null);

  // Referral Copy State
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(null);

  const [lookupPhone, setLookupPhone] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("customer_phone") || "";
    }
    return "";
  });

  const userPhone = (user?.phone || lookupPhone).trim();
  const consumerRefCode = userPhone ? `REF_${userPhone}` : "REF_VIP";

  // In-App Toast State
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCustomerData = useCallback(async () => {
    if (!userPhone) return;
    setLoadingData(true);
    try {
      const [ticketsResp, apptResp, loyaltyResp, profileResp, walletResp, couponsResp] = await Promise.all([
        api.queue.getCustomerTickets(userPhone).catch(() => ({ success: false } as any)),
        api.appointments.getByCustomer(userPhone).catch(() => ({ success: false, appointments: [] } as any)),
        api.loyalty.getCustomerCards(userPhone).catch(() => ({ success: false, cards: [] } as any)),
        api.customer.getProfile(userPhone).catch(() => ({ success: false, profile: null } as any)),
        api.wallets.getBalance("CONSUMER", userPhone).catch(() => ({ success: false, balance: 0 } as any)),
        api.coupons.getAll({ status: "ACTIVE" }).catch(() => ({ success: false, coupons: [] } as any)),
      ]);

      // 1. Tickets & History
      if (ticketsResp?.success) {
        if (ticketsResp.activeTicket) {
          setActiveTicket(ticketsResp.activeTicket);
        } else {
          setActiveTicket(null);
        }
        if (ticketsResp.history && ticketsResp.history.length > 0) {
          const mapped: VisitHistoryItem[] = ticketsResp.history.map((t: any, idx: number) => ({
            id: t.id,
            salonName: t.salonName || "Salon Partner",
            salonSlug: t.salonSlug || "getsalon",
            date: t.completedTime
              ? new Date(t.completedTime).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Recent Visit",
            service: t.serviceName || "Haircut & Styling",
            stylistName: t.stylistName || "Assigned Stylist",
            amount: t.paymentAmount || t.totalPrice || 150,
            paymentMethod: t.paymentStatus === "ONLINE_PAID" ? "UPI" : "CASH",
            invoiceNumber: `EQ-IN-${t.ticketNumber || 8400 + idx}`,
          }));
          setRealVisits(mapped);
        } else {
          setRealVisits([]);
        }
      }

      // 2. Prepaid Appointments
      if (apptResp?.success && Array.isArray(apptResp.appointments)) {
        setAppointments(apptResp.appointments);
      }

      // 3. Multi-Salon Loyalty Cards
      if (loyaltyResp?.success && Array.isArray(loyaltyResp.cards)) {
        setLoyaltyCards(loyaltyResp.cards);
        const countVouchers = loyaltyResp.cards.reduce(
          (acc: number, c: any) => acc + (c.activeVouchers?.length || 0),
          0
        );
        setTotalActiveVouchers(countVouchers);
      } else {
        setLoyaltyCards([]);
      }

      // 4. Grooming Profile
      if (profileResp?.success && profileResp.profile) {
        if (profileResp.profile.preferredBarberName) {
          setPreferredStylist(profileResp.profile.preferredBarberName);
        }
        if (profileResp.profile.groomingSpecs) {
          setHaircutSpecs(profileResp.profile.groomingSpecs);
        }
      }

      // 5. Consumer Wallet
      if (walletResp?.success && typeof walletResp.balance === "number") {
        setConsumerWalletBalance(walletResp.balance);
      }

      // 6. Available Coupons
      if (couponsResp?.success && Array.isArray(couponsResp.coupons)) {
        setAvailableCoupons(couponsResp.coupons);
      }
    } catch (err) {
      console.warn("Failed to fetch customer data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [userPhone]);

  const handleCheckInAppt = async (apptId: string) => {
    setCheckingInId(apptId);
    try {
      const res = await api.appointments.checkIn(apptId);
      if (res.success) {
        showToast("Checked in successfully! Staff notified of your arrival.", "success");
        fetchCustomerData();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to check in.", "error");
    } finally {
      setCheckingInId(null);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  // Real-time WebSocket hook: Subscribe to current salon so customer ticket updates are caught live
  const effectiveSalonId = activeTicket?.salonId || (user as any)?.salonId || undefined;
  useSalonSocket(effectiveSalonId, (event) => {
    console.log("[Customer Portal /me] Socket event:", event.type);
    fetchCustomerData();
  });

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleConfirmCancelTicket = async () => {
    if (!activeTicket) return;
    setCancelling(true);
    try {
      await api.queue.cancel(activeTicket.id, "Customer left via portal");
      setActiveTicket(null);
      setIsCancelConfirmOpen(false);
      showToast("Your queue spot has been cancelled.", "info");
      fetchCustomerData();
    } catch (err: any) {
      showToast("Failed to cancel ticket: " + (err.message || "Unknown error"), "error");
    } finally {
      setCancelling(false);
    }
  };

  const handleSaveSpecs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPhone) {
      showToast("Please enter your phone number first.", "error");
      return;
    }
    setIsSavingSpecs(true);
    try {
      const res = await api.customer.updateProfile({
        phone: userPhone,
        preferredBarberName: preferredStylist.trim(),
        groomingSpecs: haircutSpecs.trim(),
      });
      if (res.success) {
        setIsEditingSpecs(false);
        setSpecsSaved(true);
        showToast("Grooming specifications saved to database!", "success");
        setTimeout(() => setSpecsSaved(false), 3000);
      } else {
        showToast(res.message || "Could not save specifications.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save profile.", "error");
    } finally {
      setIsSavingSpecs(false);
    }
  };

  const handleCopyReferral = () => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/s/getsalon?ref=${consumerRefCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedReferral(true);
    showToast("Referral link copied to clipboard!", "success");
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/s/getsalon?ref=${consumerRefCode}`;
    const text = encodeURIComponent(
      `Hey! Join live queues and skip the wait at salons with EngineQue. Use my referral code *${consumerRefCode}* to get special discounts: ${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucherCode(code);
    showToast(`Voucher ${code} copied!`, "success");
    setTimeout(() => setCopiedVoucherCode(null), 2500);
  };

  const navItems = [
    { id: "overview", label: "My Hub Overview", icon: LayoutDashboard },
    { id: "specs", label: "Haircut Specs & Notes", icon: Scissors },
    {
      id: "loyalty",
      label: "Loyalty Stamp Cards",
      icon: Gift,
      badge: totalActiveVouchers > 0 ? `${totalActiveVouchers} Reward` : undefined,
    },
    { id: "history", label: "Visits & Tax Invoices", icon: Receipt },
    { id: "referrals", label: "Refer & Coupon Codes", icon: TicketPercent },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            <User className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-white block leading-tight">Customer Portal</span>
            <span className="text-[10px] text-slate-400">{user?.username || userPhone || "Guest Client"}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar on Desktop / Slide-out on Mobile */}
      <aside
        className={`${
          isMobileMenuOpen ? "flex" : "hidden"
        } md:flex w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/60 backdrop-blur-xl p-5 flex-col justify-between shrink-0 md:min-h-screen sticky md:top-0 z-40`}
      >
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
                {user?.username || (userPhone ? `+91 ${userPhone}` : "Guest Client")}
              </h1>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Badge variant="purple" className="text-[9px] px-1.5 py-0 font-bold">MEMBER</Badge>
                <span>Frequent Guest</span>
              </div>
            </div>
          </div>

          {/* Quick Action: Join Live Queue */}
          <Link href="/s/getsalon" className="block">
            <Button
              size="sm"
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-2 shadow-md shadow-amber-500/20"
            >
              <Scissors className="h-3.5 w-3.5" />
              <span>Join Live Salon Queue</span>
            </Button>
          </Link>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <div className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
              ACCOUNT & PERKS
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && <ChevronRight className="h-3.5 w-3.5 opacity-75" />}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="pt-6 border-t border-slate-800/80 space-y-3">
          {user ? (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-between">
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user.username}</p>
                <p className="text-[10px] text-slate-400">Authenticated Session</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  try {
                    await logout();
                  } catch {}
                  router.push("/login");
                }}
                title="Logout"
                className="h-8 w-8"
              >
                <LogOut className="h-4 w-4 text-slate-400 hover:text-rose-400" />
              </Button>
            </div>
          ) : (
            <Link href="/login?redirect=/me" className="w-full block">
              <Button
                variant="outline"
                className="w-full text-xs gap-1.5 border-slate-700 hover:bg-slate-800 text-slate-200"
              >
                <LogIn className="h-3.5 w-3.5 text-blue-400" />
                Sign In to Account
              </Button>
            </Link>
          )}

          <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
            <Link href="/" className="hover:text-blue-400 transition-colors">
              ← Main Launcher
            </Link>
            <span>v1.4.3</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl space-y-8">
        {/* Toast Alert Banner */}
        {toast && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-in slide-in-from-top-2 ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-600/50 text-emerald-200"
                : toast.type === "error"
                ? "bg-rose-950/90 border-rose-600/50 text-rose-200"
                : "bg-blue-950/90 border-blue-600/50 text-blue-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
              {toast.type === "error" && <Trash2 className="h-5 w-5 text-rose-400 shrink-0" />}
              {toast.type === "info" && <Sparkles className="h-5 w-5 text-blue-400 shrink-0" />}
              <span className="text-sm font-semibold">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs opacity-70 hover:opacity-100 p-1 rounded transition-opacity"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Welcome Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/30 via-slate-900 to-amber-950/20 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="purple" className="text-xs px-2.5 py-0.5">
                    FREQUENT GROOMER
                  </Badge>
                  {totalActiveVouchers > 0 && (
                    <Badge variant="warning" className="text-xs px-2.5 py-0.5 animate-pulse font-bold">
                      🎁 {totalActiveVouchers} FREE REWARD UNLOCKED
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-black text-white">
                  Welcome, {user?.username || (userPhone ? `+91 ${userPhone}` : "Guest")}
                </h1>
                <p className="text-xs text-slate-400">
                  Your personalized fade specs, digital invoices, multi-salon loyalty stamps, and cash perks.
                </p>
              </div>

              <Link href="/s/getsalon">
                <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm gap-2 rounded-xl shadow-lg shadow-amber-500/20">
                  <Sparkles className="h-4 w-4" />
                  <span>1-Tap Re-Queue for My Cut</span>
                </Button>
              </Link>
            </div>

            {/* Quick Phone Lookup for Guest Customers */}
            {!userPhone && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Find My Bookings &amp; Loyalty Passes</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Enter your 10-digit WhatsApp phone number to view and manage your active appointments, queue passes, and multi-salon stamp cards.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit Phone"
                    maxLength={10}
                    defaultValue={lookupPhone}
                    id="phone-lookup-input"
                    className="max-w-xs h-11 bg-slate-950 border-slate-800 text-sm font-mono"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("phone-lookup-input") as HTMLInputElement;
                      if (input && input.value.replace(/\D/g, "").length === 10) {
                        const val = input.value.replace(/\D/g, "");
                        setLookupPhone(val);
                        try {
                          localStorage.setItem("customer_phone", val);
                        } catch {}
                      }
                    }}
                    className="h-11 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Load My Passes
                  </Button>
                </div>
              </div>
            )}

            {/* ACTIVE PREPAID APPOINTMENTS & GUARANTEED PASSES */}
            {appointments.filter((a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN" || a.status === "IN_CHAIR" || a.status === "PENDING_PAYMENT").length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-amber-400" />
                    <span>Guaranteed Appointments &amp; Passes</span>
                  </h2>
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
                    {appointments.filter((a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN" || a.status === "IN_CHAIR" || a.status === "PENDING_PAYMENT").length} Active
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {appointments
                    .filter((a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN" || a.status === "IN_CHAIR" || a.status === "PENDING_PAYMENT")
                    .map((appt) => {
                      const balance = Math.max(0, appt.totalPrice - appt.advanceAmount);
                      const pct = appt.totalPrice > 0 ? Math.round((appt.advanceAmount / appt.totalPrice) * 100) : 0;
                      return (
                        <Card
                          key={appt.id}
                          className="border border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 p-5 space-y-4 shadow-xl rounded-3xl animate-in zoom-in-95"
                        >
                          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2.5">
                              <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Scissors className="h-4 w-4" />
                              </span>
                              <div>
                                <h3 className="text-sm font-bold text-white">{appt.serviceName}</h3>
                                <p className="text-[11px] text-amber-400 font-medium">
                                  {appt.salonName} {appt.salonAddress ? `· ${appt.salonAddress}` : ""}
                                </p>
                              </div>
                            </div>

                            <Badge
                              className={`text-[10px] font-bold ${
                                appt.status === "CONFIRMED"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : appt.status === "CHECKED_IN"
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  : appt.status === "IN_CHAIR"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-slate-800 text-slate-300"
                              }`}
                            >
                              {appt.status === "CONFIRMED"
                                ? "✓ Guaranteed Slot"
                                : appt.status === "CHECKED_IN"
                                ? "⚡ Checked In"
                                : appt.status === "IN_CHAIR"
                                ? "💺 In Chair"
                                : appt.status}
                            </Badge>
                          </div>

                          {/* Date, Time & Escrow Details */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block font-medium">Scheduled Date</span>
                              <span className="font-bold text-white font-mono">{appt.scheduledDate}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block font-medium">Time Slot</span>
                              <span className="font-bold text-emerald-400 font-mono">
                                {appt.slotStartTime} - {appt.slotEndTime}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block font-medium">Prepaid Escrow</span>
                              <span className="font-bold text-amber-400 font-mono">
                                ₹{appt.advanceAmount} ({pct}%)
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block font-medium">Balance at Salon</span>
                              <span className="font-bold text-slate-300 font-mono">
                                ₹{balance}
                              </span>
                            </div>
                          </div>

                          {/* Action CTAs */}
                          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                            <Link
                              href={`/s/${appt.salonSlug || "royal"}/appointment/${appt.id}`}
                              className="w-full sm:flex-1 min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                            >
                              <QrCode className="h-4 w-4" />
                              <span>View Digital QR Pass</span>
                            </Link>

                            {appt.status === "CONFIRMED" && (
                              <Button
                                type="button"
                                onClick={() => setReschedulingAppt(appt)}
                                className="w-full sm:w-auto min-h-[48px] px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                              >
                                <RotateCcw className="h-4 w-4" />
                                <span>1-Tap Reschedule</span>
                              </Button>
                            )}

                            {appt.status === "CONFIRMED" && (
                              <Button
                                type="button"
                                disabled={checkingInId === appt.id}
                                onClick={() => handleCheckInAppt(appt.id)}
                                className="w-full sm:w-auto min-h-[48px] px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{checkingInId === appt.id ? "Checking In..." : "Check In"}</span>
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}

            {/* LIVE ACTIVE QUEUE TICKET TRACKER */}
            {activeTicket && (
              <Card className="border-2 border-amber-500 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
                  <Badge
                    variant={
                      activeTicket.status === "CALLED" || activeTicket.status === "SUMMONED"
                        ? "warning"
                        : activeTicket.status === "IN_SERVICE" || activeTicket.status === "IN_CHAIR"
                        ? "success"
                        : "default"
                    }
                    className="px-3 py-1 text-xs font-bold"
                  >
                    {activeTicket.status === "CALLED" || activeTicket.status === "SUMMONED"
                      ? "📢 STEP TO CHAIR NOW!"
                      : activeTicket.status === "IN_SERVICE" || activeTicket.status === "IN_CHAIR"
                      ? "💺 CURRENTLY IN CHAIR"
                      : activeTicket.status === "SOFT_BUMPED"
                      ? "⏳ 3-MIN HOLD"
                      : "🎟️ ACTIVE IN QUEUE"}
                  </Badge>

                  <span className="text-xs text-amber-400 font-semibold">
                    {activeTicket.salonName || "Salon Queue"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-amber-500 text-slate-950 font-black text-3xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                      #{activeTicket.ticketNumber}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{activeTicket.serviceName || "Haircut Service"}</h3>
                      <p className="text-xs text-slate-400">
                        {activeTicket.salonName} · {activeTicket.stylistName ? `Barber: ${activeTicket.stylistName}` : "Fastest Available Barber"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Est. Wait</span>
                    <span className="text-2xl font-black text-blue-400">
                      ~{activeTicket.estimatedWaitMinutes > 0
                        ? activeTicket.estimatedWaitMinutes
                        : (activeTicket.positionInQueue > 1 ? Math.max(5, (activeTicket.positionInQueue - 1) * 15) : 5)}m
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Link href={`/s/${activeTicket.salonSlug || "getsalon"}`} className="flex-1">
                    <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Live Pocket Board</span>
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCancelConfirmOpen(true)}
                    className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Leave Queue</span>
                  </Button>
                </div>
              </Card>
            )}

            {/* Quick KPI Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Store className="h-3.5 w-3.5 text-blue-400" />
                  Salons Visited
                </span>
                <p className="text-2xl font-black text-white">{loyaltyCards.length}</p>
                <p className="text-[10px] text-slate-400">Independent cards</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-amber-400" />
                  Free Vouchers
                </span>
                <p className="text-2xl font-black text-amber-400">{totalActiveVouchers}</p>
                <p className="text-[10px] text-slate-400">Ready to redeem</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                  Lifetime Visits
                </span>
                <p className="text-2xl font-black text-emerald-400">{realVisits.length}</p>
                <p className="text-[10px] text-slate-400">Completed cuts</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5 text-indigo-400" />
                  Referral Cash
                </span>
                <p className="text-2xl font-black text-indigo-400">₹{consumerWalletBalance}</p>
                <p className="text-[10px] text-slate-400">Wallet balance</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HAIRCUT SPECS & BARBER NOTES */}
        {(activeTab === "overview" || activeTab === "specs") && (
          <Card className="border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-amber-400" />
                  <span>My Grooming Specs &amp; Barber Notes</span>
                </CardTitle>
                <CardDescription>
                  Stored permanently in your profile. Shown automatically to your assigned stylist at check-in.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingSpecs(!isEditingSpecs)}
                className="text-xs h-8 border-slate-700"
              >
                {isEditingSpecs ? "Cancel" : "Edit Specs"}
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {isEditingSpecs ? (
                <form onSubmit={handleSaveSpecs} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Preferred Stylist / Barber Name
                    </label>
                    <Input
                      value={preferredStylist}
                      onChange={(e) => setPreferredStylist(e.target.value)}
                      placeholder="e.g. Ramesh Master Barber or Leo"
                      className="bg-slate-900 border-slate-700 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Haircut &amp; Beard Specifications (Style Notes)
                    </label>
                    <textarea
                      rows={3}
                      value={haircutSpecs}
                      onChange={(e) => setHaircutSpecs(e.target.value)}
                      placeholder="e.g. Skin fade on sides, scissor texture on top, keep mustache natural, beard lined up with straight razor."
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={isSavingSpecs}
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      {isSavingSpecs ? "Saving..." : "Save to Database"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingSpecs(false)}
                      className="text-xs text-slate-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Preferred Barber:</span>
                    <strong className="text-white">
                      {preferredStylist || "Fastest Available Barber"}
                    </strong>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60">
                    <span className="text-[11px] text-slate-400 block mb-1">Haircut Style Notes:</span>
                    {haircutSpecs ? (
                      <p className="text-xs text-slate-200 italic font-mono bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        &quot;{haircutSpecs}&quot;
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        No styling notes saved yet. Click &quot;Edit Specs&quot; to save your fade grade, beard length, or styling preferences.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {specsSaved && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Grooming specifications saved to your profile!</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 3: MULTI-SALON LOYALTY STAMP CARDS */}
        {(activeTab === "overview" || activeTab === "loyalty") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-400" />
                  <span>Multi-Salon Loyalty Stamp Cards</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Each salon you visit tracks your haircut milestones independently. Earn 1 stamp per checkout.
                </p>
              </div>
              <Badge variant="warning" className="text-xs font-bold">
                {loyaltyCards.length} {loyaltyCards.length === 1 ? "Salon Card" : "Salon Cards"}
              </Badge>
            </div>

            {loyaltyCards.length === 0 ? (
              <Card className="border-dashed border-slate-800 bg-slate-900/40 p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                  <Gift className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-white">No Loyalty Stamp Cards Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When you visit any partner salon and complete your haircut or grooming session, your digital loyalty stamp card will automatically activate right here!
                </p>
                <Link href="/s/getsalon">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs mt-2">
                    Browse Partner Salons
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {loyaltyCards.map((cardItem) => {
                  const stampGoal = cardItem.stampGoal > 0 ? cardItem.stampGoal : 6;
                  const currentStamps = cardItem.currentStamps;
                  const remaining = Math.max(0, stampGoal - currentStamps);
                  const activeVouchers = cardItem.activeVouchers || [];

                  return (
                    <Card
                      key={cardItem.id || cardItem.salonId}
                      className="border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 shadow-xl overflow-hidden"
                    >
                      <CardHeader className="pb-3 border-b border-slate-800/80">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Store className="h-4 w-4" />
                              </span>
                              <CardTitle className="text-base font-black text-white">
                                {cardItem.salonName}
                              </CardTitle>
                            </div>
                            <CardDescription className="text-xs mt-1">
                              Reward: <strong className="text-amber-300">Free {cardItem.rewardServiceName || "Haircut / Styling"}</strong>{" "}
                              {cardItem.rewardServicePrice > 0 && (
                                <span className="text-slate-400">
                                  (Worth ₹{cardItem.rewardServicePrice} or credit towards any service)
                                </span>
                              )}
                            </CardDescription>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="warning" className="text-xs font-bold px-2.5 py-1">
                              {currentStamps} of {stampGoal} Cuts
                            </Badge>
                            <Link href={`/s/${cardItem.salonSlug}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-white px-2">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Storefront
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-5 pt-4">
                        {/* UNLOCKED GOLD PASS VOUCHER BANNER (If customer has milestone vouchers) */}
                        {activeVouchers.length > 0 && (
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-yellow-500/20 border-2 border-amber-400/80 shadow-lg space-y-3 animate-in zoom-in-95">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
                                <PartyPopper className="h-4 w-4 text-amber-400" />
                                🌟 UNLOCKED VIP MILESTONE REWARD!
                              </span>
                              <Badge className="bg-amber-400 text-slate-950 font-black text-[10px]">
                                READY TO CLAIM
                              </Badge>
                            </div>

                            {activeVouchers.map((voucher) => (
                              <div
                                key={voucher.id}
                                className="p-3 rounded-xl bg-slate-950/80 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div>
                                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                    <span>100% Free {voucher.rewardServiceName || "Haircut"}</span>
                                    {voucher.rewardServicePrice > 0 && (
                                      <span className="text-[11px] text-emerald-400 font-mono">
                                        (Save ₹{voucher.rewardServicePrice})
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Valid at {cardItem.salonName} · Free {voucher.rewardServiceName || "Haircut"} or ₹{voucher.rewardServicePrice || 150} credit towards any service. Present code or phone at check-in.
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <code className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                                    {voucher.voucherCode}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCopyVoucher(voucher.voucherCode)}
                                    className="h-8 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                                  >
                                    {copiedVoucherCode === voucher.voucherCode ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Stamp Circles Grid (Dynamic count based on salon stampGoal) */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                            {Array.from({ length: stampGoal }, (_, i) => i + 1).map((num) => {
                              const isCompleted = num <= currentStamps;
                              const isReward = num === stampGoal;

                              return (
                                <div
                                  key={num}
                                  className={`h-14 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                                    isCompleted
                                      ? "border-amber-400 bg-amber-500/20 text-amber-300 font-black shadow-md shadow-amber-500/10"
                                      : isReward
                                      ? "border-dashed border-amber-500/60 bg-amber-500/5 text-amber-400"
                                      : "border-slate-800 bg-slate-900/60 text-slate-600"
                                  }`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-6 w-6 text-amber-400" />
                                  ) : isReward ? (
                                    <Gift className="h-6 w-6 text-amber-400/80" />
                                  ) : (
                                    <span className="text-sm font-bold font-mono">{num}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 pt-1">
                            <span>
                              {remaining === 0 ? (
                                <strong className="text-emerald-400">🎉 Milestone reached! Reward voucher is unlocked above.</strong>
                              ) : (
                                <>
                                  🎁 <strong>{remaining} more {remaining === 1 ? "visit" : "visits"}</strong> to unlock your Free {cardItem.rewardServiceName || "Haircut"}!
                                </>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {cardItem.totalLifetimeStamps} total lifetime visits · {cardItem.completedMilestones} completed milestones
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VISITS & TAX INVOICES */}
        {(activeTab === "overview" || activeTab === "history") && (
          <Card className="border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-400" />
                  <span>Visit History &amp; Digital Tax Invoices</span>
                </CardTitle>
                <CardDescription>
                  Review previous completed appointments, barbers, and download verified digital receipts.
                </CardDescription>
              </div>
              <Badge variant="default">{realVisits.length} Completed</Badge>
            </CardHeader>

            <CardContent>
              {realVisits.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">No completed visits recorded yet</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Your official tax invoices, barber records, and payment receipts will appear here automatically after your salon visits.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {realVisits.map((item) => (
                    <div
                      key={item.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-800/30 px-3 rounded-2xl transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-11 w-11 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{item.service}</h4>
                          <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-white font-medium">{item.salonName}</span>
                            <span>•</span>
                            <span>Barber: {item.stylistName}</span>
                            <span>•</span>
                            <span>{item.date}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-400">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">
                            {item.paymentMethod} PAID
                          </span>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(item)}
                          className="text-xs h-8 border-slate-700 hover:border-blue-400 text-slate-300 gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5 text-blue-400" />
                          <span>Invoice</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 5: COUPONS & REFERRALS */}
        {(activeTab === "overview" || activeTab === "referrals") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Consumer Referral Card */}
            <Card className="border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-emerald-400" />
                    <span>Refer Friends &amp; Earn Cash</span>
                  </CardTitle>
                  <Badge variant="purple" className="text-[10px] font-bold">
                    ₹{consumerWalletBalance} WALLET
                  </Badge>
                </div>
                <CardDescription>
                  Share your personal link. Friends get discounts and your wallet earns credits on every referral!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Your Personal Code</span>
                    <code className="text-emerald-400 font-mono text-sm font-bold">{consumerRefCode}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 border-slate-700"
                      onClick={handleCopyReferral}
                    >
                      {copiedReferral ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedReferral ? "Copied" : "Copy Link"}</span>
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      onClick={handleWhatsAppShare}
                    >
                      <span>WhatsApp</span>
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 text-slate-400 text-[11px]">
                  <p>• Applied automatically when friends check in or enter your referral code.</p>
                  <p>• Wallet balance can be used directly for bill discounts at partner salons.</p>
                </div>
              </CardContent>
            </Card>

            {/* Live Platform & Salon Coupon Codes */}
            <Card className="border-slate-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TicketPercent className="h-4 w-4 text-amber-400" />
                  <span>Available Coupon Codes</span>
                </CardTitle>
                <CardDescription>Active promotional discounts ready to apply on your next haircut.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {availableCoupons.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    No special coupons active today. Check back during festival periods!
                  </div>
                ) : (
                  availableCoupons.slice(0, 5).map((coupon) => (
                    <div
                      key={coupon.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-amber-300">{coupon.code}</span>
                        <p className="text-[11px] text-slate-400">
                          {coupon.discountType === "PERCENT"
                            ? `${coupon.discountValue}% off`
                            : `₹${coupon.discountValue} off`}
                          {coupon.minOrderAmount && coupon.minOrderAmount > 0
                            ? ` on orders above ₹${coupon.minOrderAmount}`
                            : " on your visit"}
                        </p>
                      </div>
                      <Badge variant="warning" className="text-[10px] font-bold">
                        ACTIVE
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Digital Tax Invoice Modal */}
      <Dialog open={Boolean(selectedInvoice)} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogClose onClose={() => setSelectedInvoice(null)} />
        {selectedInvoice && (
          <div className="space-y-6 p-2">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Tax Invoice Receipt</span>
                <Badge variant="success">PAID</Badge>
              </DialogTitle>
              <DialogDescription>
                Official digital receipt for tax and personal records.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 rounded-2xl bg-white text-slate-950 font-mono text-xs space-y-4 shadow-inner border border-slate-200">
              <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
                <p className="font-black text-base uppercase">{selectedInvoice.salonName}</p>
                <p className="text-[10px] text-slate-600">GSTIN: 07AAAAA0000A1Z5</p>
                <p className="text-[10px] text-slate-600">Invoice: #{selectedInvoice.invoiceNumber}</p>
                <p className="text-[10px] text-slate-600">Date: {selectedInvoice.date}</p>
              </div>

              <div className="space-y-2 py-2">
                <div className="flex justify-between font-bold">
                  <span>{selectedInvoice.service}</span>
                  <span>{formatCurrency(selectedInvoice.amount)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Barber / Stylist:</span>
                  <span>{selectedInvoice.stylistName}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Payment Mode:</span>
                  <span>{selectedInvoice.paymentMethod}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-slate-300 flex justify-between font-black text-sm">
                <span>TOTAL PAID:</span>
                <span>{formatCurrency(selectedInvoice.amount)}</span>
              </div>

              <p className="text-center text-[10px] text-slate-500 pt-2">
                Thank you for visiting {selectedInvoice.salonName}!
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Print / Save PDF
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Modal: Confirm Cancel Queue Spot */}
      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogClose onClose={() => setIsCancelConfirmOpen(false)} />
        <div>
          <DialogHeader>
            <DialogTitle className="text-rose-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />
              Cancel Queue Spot?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your queue ticket{" "}
              <strong className="text-white">#{activeTicket?.ticketNumber}</strong>? Your position will be released to other waiting clients.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCancelConfirmOpen(false)}
              disabled={cancelling}
            >
              Keep My Spot
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCancelTicket}
              disabled={cancelling}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel My Spot"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 1-Tap Reschedule Modal for Prepaid Appointments */}
      {reschedulingAppt && (
        <RescheduleModal
          isOpen={!!reschedulingAppt}
          onClose={() => setReschedulingAppt(null)}
          appointment={reschedulingAppt}
          salonSlug={reschedulingAppt.salonSlug || "getsalon"}
          onSuccess={(updated) => {
            showToast(`Appointment rescheduled successfully to ${updated.slotStartTime}!`, "success");
            setReschedulingAppt(null);
            fetchCustomerData();
          }}
        />
      )}
    </div>
  );
}
