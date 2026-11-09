"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Organization, SubscriptionPlan } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function SalonSubscriptionsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingOrgId, setUpdatingOrgId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgRes, planRes] = await Promise.all([
        api.salons.getOrganizations(),
        api.plans.getAll(),
      ]);
      if (orgRes && orgRes.organizations) {
        setOrganizations(orgRes.organizations);
      }
      if (planRes && planRes.plans) {
        setPlans(planRes.plans);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to load salon subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTierChange = async (orgId: string, newTier: "STARTER" | "PRO" | "ENTERPRISE") => {
    setUpdatingOrgId(orgId);
    try {
      const res = await api.salons.updateTier(orgId, newTier);
      if (res && res.organization) {
        setOrganizations((prev) =>
          prev.map((o) => (o.id === orgId ? { ...o, tier: newTier } : o))
        );
        showToast("success", `Updated ${res.organization.name} subscription to ${newTier}!`);
      } else {
        showToast("error", "Failed to update subscription tier");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error updating tier");
    } finally {
      setUpdatingOrgId(null);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return org.name.toLowerCase().includes(s) || org.slug.toLowerCase().includes(s) || org.id.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : toast.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
              : "bg-blue-950/90 border-blue-500/50 text-blue-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-blue-400 font-medium">Salon Subscriptions</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            👥 Tenant Salon Subscriptions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage active subscription tiers, cycle billing, and dynamic quota overrides across all onboarded salons.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 text-blue-400 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/admin/plans">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
            >
              Subscription Plans Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter salon by name, slug, or organization ID..."
          className="pl-9 bg-slate-900/70 border-slate-700 text-slate-100 placeholder:text-slate-500 h-10"
        />
      </div>

      {/* Salon Subscriptions Table */}
      <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Salon Organization</th>
                <th className="py-3 px-4">Slug Identifier</th>
                <th className="py-3 px-4">Active Plan Tier</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Quota Overrides</th>
                <th className="py-3 px-4 text-right">Quick Tier Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 text-blue-400 animate-spin mx-auto mb-2" />
                    Loading salon accounts...
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No salon organizations found.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const isUpdating = updatingOrgId === org.id;

                  return (
                    <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>{org.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{org.id}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        <Link
                          href={`/s/${org.slug}`}
                          target="_blank"
                          className="hover:text-blue-400 flex items-center gap-1"
                        >
                          /s/{org.slug}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={
                            org.tier === "ENTERPRISE"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px]"
                              : org.tier === "PRO"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                          }
                        >
                          {org.tier}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                          ACTIVE
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        <span>Standard Tier Quota</span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={org.tier}
                          disabled={isUpdating}
                          onChange={(e) =>
                            handleTierChange(org.id, e.target.value as "STARTER" | "PRO" | "ENTERPRISE")
                          }
                          className="bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-slate-600 focus:border-blue-500 disabled:opacity-50"
                        >
                          <option value="STARTER">Starter Tier</option>
                          <option value="PRO">Pro Tier</option>
                          <option value="ENTERPRISE">Enterprise Tier</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}