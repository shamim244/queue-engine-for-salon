"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { AuthPasswordInput } from "@/components/auth/auth-password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Scissors,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Building2,
  Info,
} from "lucide-react";

function SalonLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const defaultTab = searchParams.get("tab") === "staff" ? "staff" : "owner";

  const { login, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"owner" | "staff">(defaultTab);

  // Owner Form State
  const [ownerIdentifier, setOwnerIdentifier] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // Staff Form State
  const [staffIdentifier, setStaffIdentifier] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showStaffInfo, setShowStaffInfo] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.role === "SALON_OWNER") {
        router.push(redirectParam?.startsWith("/owner") ? redirectParam : "/owner");
      } else if (user.role === "STAFF") {
        router.push(
          redirectParam?.startsWith("/staff") || redirectParam?.includes("/station")
            ? redirectParam
            : "/staff"
        );
      }
    }
  }, [user, redirectParam, router]);

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!ownerIdentifier.trim() || !ownerPassword.trim()) {
      setErrorMessage("Please enter your salon owner username or email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await login(ownerIdentifier.trim(), ownerPassword);
      if (resp.user?.role === "SALON_OWNER") {
        const activeSalonSlug = resp.salon?.slug || (resp.branches && resp.branches.length > 0 ? resp.branches[0].slug : null);
        if (activeSalonSlug) {
          router.push(redirectParam?.startsWith("/owner") ? redirectParam : `/owner?salon=${activeSalonSlug}`);
        } else {
          router.push("/register?role=owner");
        }
      } else if (resp.user?.role === "STAFF") {
        const staffSalon = resp.salon?.slug || (resp.staff?.salonId ? resp.branches?.find(b => b.id === resp.staff?.salonId)?.slug : null) || resp.user?.salonId;
        if (staffSalon) {
          router.push(`/s/${staffSalon}/station`);
        } else {
          router.push("/staff");
        }
      } else {
        await logout();
        if (resp.user?.role === "SUPER_ADMIN") {
          setErrorMessage("Platform Administrators please use the dedicated portal at /hq/login.");
        } else {
          setErrorMessage("This portal is strictly for Salon Owners & Staff. Affiliates please sign in at /partner/login.");
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid salon credentials. Please check your username and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!staffIdentifier.trim() || !staffPassword.trim()) {
      setErrorMessage("Please enter your stylist username or phone and password.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await login(staffIdentifier.trim(), staffPassword);
      if (resp.user?.role === "STAFF") {
        const staffSalon = resp.salon?.slug || (resp.staff?.salonId ? resp.branches?.find(b => b.id === resp.staff?.salonId)?.slug : null) || resp.user?.salonId;
        if (staffSalon) {
          router.push(`/s/${staffSalon}/station`);
        } else {
          router.push("/staff");
        }
      } else if (resp.user?.role === "SALON_OWNER") {
        const activeSalonSlug = resp.salon?.slug || (resp.branches && resp.branches.length > 0 ? resp.branches[0].slug : null);
        router.push(activeSalonSlug ? `/owner?salon=${activeSalonSlug}` : "/register?role=owner");
      } else {
        await logout();
        setErrorMessage("Access denied: Stylist / Staff credentials required.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid stylist credentials. Please verify with your salon owner.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardLayout
      theme="gold"
      badge={
        <Badge variant="warning" className="px-3 py-1 text-xs gap-1.5 font-medium shadow-sm">
          <Store className="w-3.5 h-3.5" />
          Salon Business Portal
        </Badge>
      }
      icon={
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
          <Scissors className="w-6 h-6" />
        </div>
      }
      title="Salon Business Sign In"
      description="Manage your chairs, live queues, staff rosters, and salon operations."
      footer={
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">Want to launch a salon on Engine Que?</span>
            <Link
              href="/register?role=owner"
              className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              Register New Salon
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="text-slate-500 text-[11px] flex items-center justify-between">
            <span>
              Customer?{" "}
              <Link href="/login" className="text-blue-400 hover:underline">
                Consumer Portal
              </Link>
            </span>
            <span>
              Partner / Promoter?{" "}
              <Link href="/partner/login" className="text-amber-400 hover:underline">
                Partner Portal
              </Link>
            </span>
          </div>
        </div>
      }
    >
      {/* Role Tabs: Owner vs Staff */}
      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab("owner");
            setErrorMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
            activeTab === "owner"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Salon Owner</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("staff");
            setErrorMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
            activeTab === "staff"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Staff / Barber</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 mb-4 animate-in fade-in">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {activeTab === "owner" ? (
        <form onSubmit={handleOwnerSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="owner-identifier" className="block text-xs font-semibold text-slate-300">
              Owner Username or Email
            </label>
            <Input
              id="owner-identifier"
              type="text"
              autoComplete="username"
              placeholder="salonowner or owner@example.com"
              value={ownerIdentifier}
              onChange={(e) => setOwnerIdentifier(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-xl bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <AuthPasswordInput
            id="owner-password"
            label="Owner Password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            disabled={isLoading}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Entering Salon Hub...</span>
              </>
            ) : (
              <>
                <span>Sign In as Salon Owner</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleStaffSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="staff-identifier" className="block text-xs font-semibold text-slate-300">
              Stylist Username or Phone
            </label>
            <Input
              id="staff-identifier"
              type="text"
              autoComplete="username"
              placeholder="e.g. ramesh or 9876543210"
              value={staffIdentifier}
              onChange={(e) => setStaffIdentifier(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-xl bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <AuthPasswordInput
            id="staff-password"
            label="Stylist Password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={staffPassword}
            onChange={(e) => setStaffPassword(e.target.value)}
            disabled={isLoading}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In to Station...</span>
              </>
            ) : (
              <>
                <span>Access Chair Station</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {/* Staff Registration Policy Banner */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowStaffInfo((prev) => !prev)}
              className="w-full text-center text-xs text-slate-400 hover:text-amber-400 flex items-center justify-center gap-1.5 py-1 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Need a staff account?</span>
            </button>
            {showStaffInfo && (
              <div className="mt-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[12px] text-slate-300 leading-relaxed text-left animate-in fade-in">
                <p className="font-semibold text-amber-300 mb-1">Staff Account Policy</p>
                Staff accounts are provisioned and linked directly by your salon owner. Please ask your
                salon manager to invite your phone number or chair from their Owner Dashboard.
              </div>
            )}
          </div>
        </form>
      )}
    </AuthCardLayout>
  );
}

export default function SalonLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      }
    >
      <SalonLoginForm />
    </Suspense>
  );
}
