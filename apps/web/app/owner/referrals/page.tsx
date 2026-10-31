"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Gift,
  Users,
  Share2,
  Sparkles,
  Trophy,
  CheckCircle2,
  Save,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function OwnerReferralsContent() {
  const searchParams = useSearchParams();
  const { salon } = useAuth();

  // Referral Settings
  const [referrerBonus, setReferrerBonus] = useState(50);
  const [refereeDiscount, setRefereeDiscount] = useState(50);
  const [stampCardGoal, setStampCardGoal] = useState(6);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Leaderboard data
  const [referrers] = useState([
    { name: "Vikram Sharma", phone: "+91 98765 ***10", referredCount: 8, totalEarned: 400 },
    { name: "Amit Verma", phone: "+91 99887 ***22", referredCount: 5, totalEarned: 250 },
    { name: "Kunal Singh", phone: "+91 98112 ***99", referredCount: 3, totalEarned: 150 },
  ]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Referrals & Loyalty Stamp Program
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Turn loyal customers into growth advocates with word-of-mouth referral bonuses and digital stamp cards.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 to-amber-950/20 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Referrals Generated</CardTitle>
            <Share2 className="h-5 w-5 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">48</div>
            <p className="text-xs text-slate-400 mt-1">Verified new clients arrived</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-emerald-950/20 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Referral Revenue Acquired</CardTitle>
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-400">{formatCurrency(7200)}</div>
            <p className="text-xs text-slate-400 mt-1">From referred new clients</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-purple-950/20 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Stamp Cards</CardTitle>
            <Gift className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">124</div>
            <p className="text-xs text-slate-400 mt-1">Clients collecting loyalty stamps</p>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Section: Configuration Rules + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral & Stamp Rules Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-400" />
              <span>Program Reward Settings</span>
            </CardTitle>
            <CardDescription>
              Configure referral credit values and stamp card milestones.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Referrer Reward (₹ Credit to existing client)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={referrerBonus}
                  onChange={(e) => setReferrerBonus(Number(e.target.value))}
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Credited to the existing client once their friend completes a haircut.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Friend Welcome Discount (₹ Off for new client)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={refereeDiscount}
                  onChange={(e) => setRefereeDiscount(Number(e.target.value))}
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Automatically deducted from the new client&apos;s first checkout bill.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Loyalty Stamp Goal (Number of Cuts for Free Service)
                </label>
                <Input
                  type="number"
                  min={3}
                  max={12}
                  value={stampCardGoal}
                  onChange={(e) => setStampCardGoal(Number(e.target.value))}
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  E.g. Visit 6 times to get a free beard styling or head massage.
                </span>
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2">
                  <Save className="h-4 w-4" />
                  Save Program Settings
                </Button>
              </div>

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Referral settings updated successfully!</span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Top Referrers Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>Top Customer Advocates</span>
            </CardTitle>
            <CardDescription>
              Customers bringing the highest number of new walk-in clients.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="divide-y divide-slate-800">
              {referrers.map((ref, idx) => (
                <div
                  key={idx}
                  className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 font-mono">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{ref.name}</p>
                      <p className="text-[11px] text-slate-400">{ref.phone}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-emerald-400 text-sm">
                      {ref.referredCount} referrals
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {formatCurrency(ref.totalEarned)} earned
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OwnerReferralsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Referrals...</div>}>
      <OwnerReferralsContent />
    </Suspense>
  );
}
