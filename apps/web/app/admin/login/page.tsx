"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { AuthPasswordInput } from "@/components/auth/auth-password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, Crown, Loader2, ArrowRight } from "lucide-react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/admin";

  const { login, logout, user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in as super admin, redirect to /admin
  useEffect(() => {
    if (user) {
      if (user.role === "SUPER_ADMIN") {
        router.push(redirectParam.startsWith("/admin") ? redirectParam : "/admin");
      } else {
        setErrorMessage("Signed in account is not a Super Admin. Please authenticate with administrator credentials.");
      }
    }
  }, [user, redirectParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage("Please enter both administrative identifier and password.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await login(identifier.trim(), password);
      if (resp.user && resp.user.role === "SUPER_ADMIN") {
        router.push(redirectParam.startsWith("/admin") ? redirectParam : "/admin");
      } else {
        // Enforce strict zero-leakage: non-admin accounts cannot enter admin portal
        await logout();
        setErrorMessage(
          "Access denied: This portal is strictly for Platform Administrators. Partners please sign in at /partner/login, consumers at /login."
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid administrative credentials or unauthorized origin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardLayout
      theme="obsidian"
      badge={
        <Badge variant="purple" className="px-3 py-1 text-xs gap-1.5 font-medium shadow-sm">
          <Crown className="w-3.5 h-3.5" />
          Platform Governance
        </Badge>
      }
      icon={
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
          <ShieldAlert className="w-6 h-6" />
        </div>
      }
      title="Admin Portal"
      description="Restricted platform governance and multi-tenant operations."
      footer={
        <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Zero-trust isolated perimeter. Unauthorized access logged.</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        <div className="space-y-1.5 text-left">
          <label htmlFor="admin-identifier" className="block text-xs font-semibold text-slate-300">
            Administrator Identifier
          </label>
          <Input
            id="admin-identifier"
            type="text"
            autoComplete="username"
            placeholder="admin@engineque.internal"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={isLoading}
            className="h-12 rounded-xl bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <AuthPasswordInput
          id="admin-password"
          label="Master Security Password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 min-h-[48px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Admin Credentials...</span>
            </>
          ) : (
            <>
              <span>Authenticate to HQ</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>
    </AuthCardLayout>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
