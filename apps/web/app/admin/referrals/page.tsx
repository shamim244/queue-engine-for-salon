"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Users,
  TrendingUp,
  Gift,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  Percent,
} from "lucide-react";

export default function AdminReferralsPage() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-pink-400 font-medium">Growth & Marketing</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white font-medium">Referrals</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            🤝 Referral & Affiliate Commission Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track multi-tier referral trees, automate B2B salon affiliate commissions, and incentivize viral customer invites.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 font-medium">Total Referral Signups</div>
            <div className="text-2xl font-black text-white mt-1">128</div>
            <p className="text-[11px] text-emerald-400 mt-1 font-semibold">+18% this month</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 font-medium">Commissions Disbursed</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(14500)}</div>
            <p className="text-[11px] text-slate-500 mt-1">Credited directly to wallets</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 font-medium">Default Commission Rate</div>
            <div className="text-2xl font-black text-purple-400 mt-1">15%</div>
            <p className="text-[11px] text-slate-500 mt-1">On 1st paid billing cycle</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 font-medium">Viral Invite K-Factor</div>
            <div className="text-2xl font-black text-blue-400 mt-1">1.42</div>
            <p className="text-[11px] text-emerald-400 mt-1">Positive viral loop</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Rules Config */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-base text-white">Referral Reward Mechanics</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Rules governing B2B owner referrals and B2C customer queue invitations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Gift className="h-4 w-4 text-purple-400" />
                <span>B2B Salon Owner Referrals</span>
              </div>
              <p className="text-xs text-slate-400">
                When Salon Owner A refers Salon Owner B, A receives 15% instant wallet credit when B subscribes to any paid plan.
              </p>
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                Active Rule
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Users className="h-4 w-4 text-emerald-400" />
                <span>B2C Customer Invite Loyalty</span>
              </div>
              <p className="text-xs text-slate-400">
                When a customer shares their queue referral link with friends, both receive ₹50 wallet discount points towards their next haircut.
              </p>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                Active Rule
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}