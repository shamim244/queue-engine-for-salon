"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Gift,
  Users,
  Sparkles,
  Trophy,
  CheckCircle2,
  Save,
  Building2,
  RefreshCw,
  Award,
  Scissors,
  Coins,
  HeartHandshake,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";

interface CatalogService {
  id: string;
  name: string;
  basePrice: number;
  estimatedDurationMinutes: number;
  isAddOn: boolean;
}

interface CustomerAdvocate {
  name: string;
  phone: string;
  referredCount: number;
  totalEarned: number;
  completedVisits: number;
}

interface LoyaltyStats {
  totalCompletedVisits: number;
  totalLoyalClients: number;
  totalReferrals: number;
  totalRewardsDisbursed: number;
  totalCards: number;
  totalStamps: number;
  activeVouchers: number;
  redeemedVouchers: number;
}

function OwnerLoyaltyContent() {
  const searchParams = useSearchParams();
  const currentSalonParam = searchParams.get("salon") || "";
  const { salon } = useAuth();
  const salonIdentifier = salon?.id || salon?.slug || currentSalonParam || "getsalon";
  const salonSlug = salon?.slug || currentSalonParam || "getsalon";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form State
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [stampGoal, setStampGoal] = useState(6);
  const [rewardServiceId, setRewardServiceId] = useState<string>("");
  const [rewardServiceName, setRewardServiceName] = useState<string>("");
  const [cooldownHours, setCooldownHours] = useState<number>(4);
  const [voucherValidityDays, setVoucherValidityDays] = useState<number>(90);
  const [referrerBonus, setReferrerBonus] = useState(50);
  const [refereeDiscount, setRefereeDiscount] = useState(50);
  const [rewardDescription, setRewardDescription] = useState("Free Haircut or Beard Grooming");
  const [availableServices, setAvailableServices] = useState<CatalogService[]>([]);

  // Dynamic Advocates & Stats
  const [advocates, setAdvocates] = useState<CustomerAdvocate[]>([]);
  const [stats, setStats] = useState<LoyaltyStats>({
    totalCompletedVisits: 0,
    totalLoyalClients: 0,
    totalReferrals: 0,
    totalRewardsDisbursed: 0,
    totalCards: 0,
    totalStamps: 0,
    activeVouchers: 0,
    redeemedVouchers: 0,
  });

  const loadLoyaltyData = async () => {
    if (!salonIdentifier) return;
    setLoading(true);
    try {
      const [settingsRes, clientRes] = await Promise.all([
        api.loyalty.getSalonSettings(salonIdentifier).catch(() => null),
        api.referrals.getClientLoyalty(salonIdentifier).catch(() => null),
      ]);

      if (settingsRes?.success && settingsRes.salon) {
        setLoyaltyEnabled(settingsRes.salon.loyaltyEnabled);
        setStampGoal(settingsRes.salon.loyaltyStampGoal || 6);
        setRewardServiceId(settingsRes.salon.loyaltyRewardServiceId || "");
        setRewardServiceName(settingsRes.salon.loyaltyRewardServiceName || "");
        setCooldownHours(settingsRes.salon.loyaltyCooldownHours ?? 4);
        setVoucherValidityDays(settingsRes.salon.loyaltyVoucherValidityDays ?? 90);
        setReferrerBonus(settingsRes.salon.loyaltyReferrerBonus ?? 50);
        setRefereeDiscount(settingsRes.salon.loyaltyRefereeDiscount ?? 50);
        setRewardDescription(settingsRes.salon.loyaltyRewardDescription || "Free Haircut or Beard Grooming");
        if (settingsRes.availableServices) {
          setAvailableServices(settingsRes.availableServices);
          if (!settingsRes.salon.loyaltyRewardServiceId && settingsRes.availableServices.length > 0) {
            setRewardServiceId(settingsRes.availableServices[0].id);
            setRewardServiceName(settingsRes.availableServices[0].name);
          }
        }
        if (settingsRes.stats) {
          setStats((prev) => ({
            ...prev,
            totalCards: settingsRes.stats.totalCards || 0,
            totalStamps: settingsRes.stats.totalStamps || 0,
            activeVouchers: settingsRes.stats.activeVouchers || 0,
            redeemedVouchers: settingsRes.stats.redeemedVouchers || 0,
          }));
        }
      }

      if (clientRes?.success) {
        setAdvocates(clientRes.customerAdvocates || []);
        if (clientRes.stats) {
          setStats((prev) => ({
            ...prev,
            totalCompletedVisits: clientRes.stats.totalCompletedVisits || 0,
            totalLoyalClients: clientRes.stats.totalLoyalClients || 0,
            totalReferrals: clientRes.stats.totalReferrals || 0,
            totalRewardsDisbursed: clientRes.stats.totalRewardsDisbursed || 0,
          }));
        }
      }
    } catch (err) {
      console.warn("Error loading loyalty data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoyaltyData();
  }, [salonIdentifier]);

  const handleSelectService = (serviceId: string) => {
    setRewardServiceId(serviceId);
    const found = availableServices.find((s) => s.id === serviceId);
    if (found) {
      setRewardServiceName(found.name);
      setRewardDescription(`Free ${found.name}`);
    }
  };

  const handleSaveLoyaltySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonIdentifier) return;
    setSaving(true);
    try {
      const res = await api.loyalty.updateSalonSettings({
        salonId: salonIdentifier,
        enabled: loyaltyEnabled,
        stampGoal,
        rewardServiceId,
        rewardServiceName,
        cooldownHours,
        voucherValidityDays,
        referrerBonus,
        refereeDiscount,
        rewardDescription,
      });
      if (res?.success) {
        if (res.salon?.loyaltyStampGoal) {
          setStampGoal(Number(res.salon.loyaltyStampGoal));
        }
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update loyalty settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Client Loyalty & Stamp Cards
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Configure digital stamp cards, friend-refer-friend haircut discounts, and track your top retail customer advocates.
          </p>
        </div>

        <Button
          onClick={loadLoyaltyData}
          variant="outline"
          size="sm"
          className="border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white min-h-[44px] gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Program Selector Tabs / Route Navigation */}
      <div className="flex gap-2 p-1 bg-slate-900/80 border border-slate-800 rounded-xl max-w-md">
        <Link
          href={`/owner/referrals?salon=${salonSlug}`}
          className="flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] text-slate-400 hover:text-white hover:bg-slate-800/40"
        >
          <Building2 className="w-4 h-4 text-purple-400" />
          <span>Salon Owner Referrals</span>
        </Link>
        <div className="flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20">
          <Gift className="w-4 h-4" />
          <span>Client Loyalty Program</span>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <Card className="bg-slate-900/70 border-slate-800">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
              <span>Loyal Clients</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalCards > 0 ? stats.totalCards : stats.totalLoyalClients}</div>
            <p className="text-[11px] text-slate-500 mt-1">Unique repeat customers</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
              <span>Completed Visits</span>
              <Scissors className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400">{stats.totalCompletedVisits}</div>
            <p className="text-[11px] text-slate-500 mt-1">Grooming sessions done</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
              <span>Stamps Awarded</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">{stats.totalStamps}</div>
            <p className="text-[11px] text-slate-500 mt-1">Digital punches collected</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
              <span>Active Vouchers</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">{stats.activeVouchers}</div>
            <p className="text-[11px] text-slate-500 mt-1">Unlocked passes in circulation</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800 col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
              <span>Rewards Redeemed</span>
              <Coins className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-400">{stats.redeemedVouchers}</div>
            <p className="text-[11px] text-slate-500 mt-1">Free services claimed</p>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column: Settings Form & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral & Stamp Rules Form */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Gift className="h-4 w-4 text-amber-400" />
              <span>Client Retention & Loyalty Rules</span>
            </CardTitle>
            <CardDescription>
              Configure referral wallet bonuses and digital loyalty stamp goals for haircut customers.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSaveLoyaltySettings} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Enable Client Loyalty & Stamps</span>
                  <span className="text-[11px] text-slate-400">
                    Show loyalty stamp status on customer ticket tracker.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={loyaltyEnabled}
                  onChange={(e) => setLoyaltyEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Customer Referrer Reward (₹ Credit to existing client)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={referrerBonus}
                  onChange={(e) => setReferrerBonus(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Credited to client&apos;s wallet once their referred friend completes their first salon service.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Friend Welcome Discount (₹ Off for new customer)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={refereeDiscount}
                  onChange={(e) => setRefereeDiscount(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Automatically deducted from the new customer&apos;s first chair bill at checkout.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Loyalty Stamp Goal (Visits per Gift)
                  </label>
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    value={stampGoal}
                    onChange={(e) => setStampGoal(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Paid visits needed to unlock a free service voucher (e.g. 6 cuts; free reward redemptions start next cycle at 0).
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Anti-Farming Cooldown (Hours)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={72}
                    value={cooldownHours}
                    onChange={(e) => setCooldownHours(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Min gap between qualifying visits to prevent rapid farming.
                  </span>
                </div>
              </div>

              {/* Selectable Reward Service from Catalog */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                  <span>Eligible Free Reward Service (Catalog Linked)</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                    Deterministic ₹0 Line Item
                  </Badge>
                </label>
                {availableServices.length > 0 ? (
                  <select
                    value={rewardServiceId}
                    onChange={(e) => handleSelectService(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs min-h-[44px] focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  >
                    {availableServices.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name} — {formatCurrency(svc.basePrice)} ({svc.estimatedDurationMinutes} mins)
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={rewardDescription}
                    onChange={(e) => setRewardDescription(e.target.value)}
                    placeholder="e.g. Free Classic Haircut"
                    className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
                  />
                )}
                <span className="text-[11px] text-slate-500 mt-1 block">
                  The exact service from your salon catalog that is deducted at 100% discount when the voucher is claimed.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Voucher Validity Window (Days)
                </label>
                <Input
                  type="number"
                  min={15}
                  max={365}
                  value={voucherValidityDays}
                  onChange={(e) => setVoucherValidityDays(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Unlocked digital vouchers expire after this period (default 90 days).
                </span>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 min-h-[48px] px-6 rounded-xl w-full sm:w-auto"
                >
                  <Save className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
                  <span>{saving ? "Saving Changes..." : "Save Loyalty Settings"}</span>
                </Button>
              </div>

              {savedSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="font-medium">Client loyalty and stamp rules saved permanently to database!</span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Top Customer Advocates Leaderboard */}
        <Card className="bg-slate-900 border-slate-800 flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>Top Customer Advocates</span>
            </CardTitle>
            <CardDescription>
              Customers bringing the highest number of walk-in friends and repeat visits to your salon.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            {advocates.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <Award className="w-8 h-8 mx-auto text-slate-600" />
                <p className="font-medium text-slate-400">No client advocates recorded yet.</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  When customers complete services or share their customer invite link, their rankings will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {advocates.map((adv, idx) => (
                  <div
                    key={`${adv.phone}-${idx}`}
                    className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full border flex items-center justify-center font-bold font-mono text-xs ${
                        idx === 0
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                          : idx === 1
                          ? "bg-slate-700/50 border-slate-600 text-slate-300"
                          : idx === 2
                          ? "bg-amber-900/30 border-amber-800/40 text-amber-600"
                          : "bg-slate-800/60 border-slate-800 text-slate-400"
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{adv.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{adv.phone}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-emerald-400 text-sm block">
                        {adv.referredCount > 0 ? `${adv.referredCount} referrals` : `${adv.completedVisits} visits`}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {adv.totalEarned > 0 ? `${formatCurrency(adv.totalEarned)} earned` : `${adv.completedVisits} haircuts`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OwnerLoyaltyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Loyalty Engine...</div>}>
      <OwnerLoyaltyContent />
    </Suspense>
  );
}
