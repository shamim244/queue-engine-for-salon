"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Gift,
  Star,
} from "lucide-react";

export default function AdminLoyaltyPage() {
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
            <span className="text-white font-medium">Loyalty Stamp Cards</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            🏆 Digital Loyalty Stamp Cards & Tier Rewards
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure automated punch-cards (e.g. 5th Haircut Free) and VIP retention tiers across salons.
          </p>
        </div>
      </div>

      {/* Loyalty Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs gap-1">
                <Star className="h-3 w-3 fill-amber-400" />
                Punch Card
              </Badge>
              <span className="text-xs text-slate-400 font-mono">5 Stamps</span>
            </div>
            <CardTitle className="text-lg font-bold text-white mt-2">
              5th Haircut 50% Off
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Customers collect 1 digital stamp per completed queue appointment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 pt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`flex-1 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    i <= 3
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  {i <= 3 ? "✓" : i}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-slate-900/60 to-slate-900/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs gap-1">
                <Award className="h-3 w-3" />
                VIP Club
              </Badge>
              <span className="text-xs text-slate-400 font-mono">Gold Tier</span>
            </div>
            <CardTitle className="text-lg font-bold text-white mt-2">
              Priority Mirror Pass
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Customers who spend &gt; ₹5,000 get express queue jump privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-400">
              Automated upgrade triggered upon reaching lifetime spend threshold.
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-900/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs gap-1">
                <Gift className="h-3 w-3" />
                Birthday Perk
              </Badge>
              <span className="text-xs text-slate-400 font-mono">Annual</span>
            </div>
            <CardTitle className="text-lg font-bold text-white mt-2">
              Free Beard Trim / Spa
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Sent automatically via WhatsApp on the customer's birthday.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-400">
              Automated via Communications Hub scheduled cron trigger.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}