"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Organization } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  Users,
  Store,
  Sparkles,
  Zap,
  ShieldCheck,
  Check,
  RefreshCw,
} from "lucide-react";

function OwnerBillingContent() {
  const searchParams = useSearchParams();
  const { salon } = useAuth();

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const currentSlug = salon?.slug || searchParams.get("salon") || "salon-rural-01";

  useEffect(() => {
    async function loadData() {
      try {
        const salonRes = await api.salons.get(currentSlug);
        if (salonRes.salon?.organizationId) {
          const orgRes = await api.salons.getOrganization(salonRes.salon.organizationId);
          if (orgRes.organization) {
            setOrg(orgRes.organization);
          }
        } else {
          // Default fallback organization
          setOrg({
            id: "org-demo",
            name: "Demo Enterprise",
            slug: "demo-enterprise",
            tier: "PRO",
            maxBranches: 3,
            maxStylistsPerBranch: 5,
            allowCustomSmsGateway: false,
            allowWhiteLabeling: false,
            branchCount: 2,
          });
        }
      } catch (e) {
        console.error("Failed to load billing:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentSlug]);

  const currentTier = org?.tier || "PRO";

  const tiers = [
    {
      id: "STARTER",
      name: "Starter Plan",
      price: "₹499",
      billing: "/ month",
      branchLimit: "1 Branch",
      stylistLimit: "Up to 3 Stylists",
      features: [
        "Door QR Poster Generator",
        "Simple 4-Digit Mirror Touch PIN",
        "WhatsApp / SMS Arrival Alerts",
        "Standard Dynamic Queue",
      ],
    },
    {
      id: "PRO",
      name: "Pro Plan",
      price: "₹1,499",
      billing: "/ month",
      popular: true,
      branchLimit: "Up to 5 Branches",
      stylistLimit: "Up to 10 Chairs / Branch",
      features: [
        "Everything in Starter",
        "Public Smart TV Departure Board",
        "Stylist Speed Calibration (15m–60m)",
        "2-Second Rapid Chair Swap",
        "Live Editable Bill & 1-Tap UPI",
      ],
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise Plan",
      price: "₹4,999",
      billing: "/ month",
      branchLimit: "Unlimited Branches",
      stylistLimit: "Unlimited Chairs",
      features: [
        "Everything in Pro",
        "White-Label Domain Mapping",
        "Custom SMS Gateway Route",
        "Dedicated Account SLA Manager",
        "Centralized HQ Financial Audit",
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Subscription & Plan Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review your active enterprise subscription, branch capacity, and chair limits.
        </p>
      </div>

      {/* Active Subscription Summary */}
      <Card className="border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">Active Subscription</CardTitle>
                <Badge variant={currentTier === "ENTERPRISE" ? "purple" : currentTier === "PRO" ? "default" : "warning"}>
                  {currentTier} PLAN
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Organization: <strong className="text-white">{org?.name || "Ramesh Grooming Enterprise"}</strong>
              </CardDescription>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Renews on</span>
              <span className="text-sm font-bold text-white">November 28, 2026</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Branch Capacity</span>
              <div className="text-2xl font-black text-white">
                {org?.branchCount || 1} <span className="text-xs font-normal text-slate-500">/ {org?.maxBranches || 3} used</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Max Chairs Per Branch</span>
              <div className="text-2xl font-black text-amber-400">
                {org?.maxStylistsPerBranch || 5} <span className="text-xs font-normal text-slate-500">chairs</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Live WebSocket Channel</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                Active <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => {
          const isCurrent = currentTier === t.id;
          return (
            <Card
              key={t.id}
              className={`relative flex flex-col justify-between ${
                isCurrent
                  ? "border-amber-500/80 shadow-xl shadow-amber-500/10 bg-slate-900/90"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="warning" className="px-3 py-0.5 shadow-md font-bold">
                    CURRENT PLAN
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white">{t.name}</CardTitle>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{t.price}</span>
                  <span className="text-xs text-slate-400">{t.billing}</span>
                </div>
                <CardDescription className="mt-1 text-xs">
                  {t.branchLimit} · {t.stylistLimit}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2 text-xs text-slate-300">
                  {t.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-3 border-t border-slate-800">
                <Button
                  className="w-full text-xs font-bold"
                  variant={isCurrent ? "secondary" : "default"}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Active Plan" : "Upgrade Plan"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function OwnerBillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Billing...</div>}>
      <OwnerBillingContent />
    </Suspense>
  );
}
