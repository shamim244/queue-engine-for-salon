"use client";

import React, { useEffect, useState } from "react";
import { api, Organization } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Building,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Zap,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function AdminBillingPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrgId, setUpdatingOrgId] = useState<string | null>(null);

  const fetchOrgs = async () => {
    try {
      const data = await api.salons.getOrganizations();
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleUpdateTier = async (orgId: string, nextTier: "SOLO" | "PRO" | "ENTERPRISE") => {
    setUpdatingOrgId(orgId);
    try {
      await api.salons.updateTier(orgId, nextTier);
      await fetchOrgs();
    } catch (err) {
      alert("Failed to update tier: " + (err as Error).message);
    } finally {
      setUpdatingOrgId(null);
    }
  };

  const tiers = [
    {
      id: "SOLO",
      name: "Rural Solo Tier",
      price: "₹499 / mo",
      branches: "1 Branch",
      stylists: "1 Chair / Stylist",
      features: ["Door QR Poster", "Simple 4-Digit Chair UI", "Basic SMS Alerts", "Standard Queue Algorithm"],
      badge: "secondary",
    },
    {
      id: "PRO",
      name: "Modern Multi Pro",
      price: "₹1,499 / mo",
      branches: "Up to 3 Branches",
      stylists: "Up to 5 Chairs / Branch",
      features: [
        "Everything in Solo",
        "Public Lobby TV Departure Board",
        "Real-time WhatsApp Alerts",
        "Speed Calibration Sliders",
        "Tactile 2-Second Chair Swap",
      ],
      badge: "default",
      popular: true,
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise Multi-Chain",
      price: "₹4,999 / mo",
      branches: "Unlimited Branches (25+)",
      stylists: "Unlimited Chairs (30+)",
      features: [
        "Everything in Pro",
        "Custom SMS Gateway Interconnect",
        "White-label Domain Mapping",
        "Super Admin Global Telemetry",
        "Priority 24/7 SLA Support",
      ],
      badge: "purple",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Subscription Tiers & Quota Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Dynamically scale tenant tier quotas, manage branch allocation, and toggle enterprise white-labeling.
        </p>
      </div>

      {/* Tier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => (
          <Card
            key={t.id}
            className={`relative flex flex-col justify-between ${
              t.popular ? "border-blue-500/60 shadow-xl shadow-blue-500/10" : "border-slate-800"
            }`}
          >
            {t.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default" className="px-3 py-0.5 shadow-md">
                  MOST POPULAR
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <CardDescription className="mt-1">{t.price}</CardDescription>
                </div>
                <Badge variant={t.badge as any}>{t.id}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs space-y-1 text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                <p>
                  <span className="text-slate-400">Branches Quota:</span>{" "}
                  <strong className="text-white">{t.branches}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Staff Limit:</span>{" "}
                  <strong className="text-white">{t.stylists}</strong>
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {t.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-500 w-full text-center">
                Automated monthly recurring billing
              </span>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Active Organizations Tier Controller */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Organization Tier Overrides</CardTitle>
            <CardDescription>
              Assign instant enterprise tier promotions or downgrades to tenant organizations.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrgs} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-800">
            {organizations.map((org) => {
              const isUpdating = updatingOrgId === org.id;
              return (
                <div
                  key={org.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-blue-400" />
                      <h4 className="font-bold text-white text-base">{org.name}</h4>
                      <Badge variant={org.tier === "ENTERPRISE" ? "purple" : org.tier === "PRO" ? "default" : "secondary"}>
                        {org.tier}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Organization ID: <code className="text-slate-300">{org.id}</code> · Slug:{" "}
                      <code className="text-blue-400">{org.slug}</code> · Branches:{" "}
                      <strong className="text-white">{org.branchCount || 1}</strong> / {org.maxBranches}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(["SOLO", "PRO", "ENTERPRISE"] as const).map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={org.tier === t ? "default" : "outline"}
                        className={`text-xs h-8 ${
                          org.tier === t ? "pointer-events-none opacity-80" : "border-slate-700 hover:border-slate-500"
                        }`}
                        onClick={() => handleUpdateTier(org.id, t)}
                        disabled={isUpdating}
                      >
                        {org.tier === t && <Check className="h-3.5 w-3.5 mr-1" />}
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
