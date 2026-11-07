"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Lock, ShieldAlert, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export type AllowedRole = "SUPER_ADMIN" | "SALON_OWNER" | "STAFF" | "CUSTOMER";

export interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: AllowedRole | AllowedRole[];
}

export function getRoleDestination(role?: string, defaultSalonSlug = "ramesh-barber"): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "SALON_OWNER":
      return "/owner";
    case "STAFF":
      return "/staff";
    case "CUSTOMER":
      return "/me";
    default:
      return "/login";
  }
}

export function getLoginRedirectForPath(pathname: string | null | undefined): string {
  const clean = pathname ? pathname.trim() : "/";
  const encoded = encodeURIComponent(clean);
  if (clean.startsWith("/admin")) {
    return `/admin/login?redirect=${encoded}`;
  }
  if (clean.startsWith("/owner")) {
    return `/partner/login?redirect=${encoded}`;
  }
  if (clean.startsWith("/staff") || clean.includes("/station")) {
    return `/partner/login?tab=staff&redirect=${encoded}`;
  }
  return `/login?redirect=${encoded}`;
}

export function resolveAuthRedirect(
  redirectParam: string | null | undefined,
  role?: string,
  defaultSalonSlug = "ramesh-barber"
): string {
  if (!role) {
    return "/login";
  }

  // 1. Extract salon slug from redirectParam if present (e.g. /s/:slug or ?salon=:slug)
  let extractedSlug: string | null = null;
  if (redirectParam && typeof redirectParam === "string") {
    const salonQueryMatch = redirectParam.match(/[?&]salon=([a-zA-Z0-9-_]+)/);
    if (salonQueryMatch) {
      extractedSlug = salonQueryMatch[1];
    } else {
      const sPathMatch = redirectParam.match(/^\/s\/([a-zA-Z0-9-_]+)/);
      if (sPathMatch) {
        extractedSlug = sPathMatch[1];
      }
    }
  }
  const effectiveSlug = extractedSlug || defaultSalonSlug;

  // 2. Validate clean relative URL (block open redirect attacks)
  const isSafeRelative =
    Boolean(redirectParam) &&
    typeof redirectParam === "string" &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//") &&
    !redirectParam.includes(":") &&
    !redirectParam.startsWith("/login");

  if (!isSafeRelative || !redirectParam) {
    return getRoleDestination(role, effectiveSlug);
  }

  const cleanPath = redirectParam.trim();

  // 3. Role-Based & Origin-Aware Redirection Decision
  switch (role) {
    case "SUPER_ADMIN": {
      // Super Admin routes to admin/owner control centers
      if (
        cleanPath.startsWith("/admin") ||
        cleanPath.startsWith("/dev") ||
        cleanPath.startsWith("/owner")
      ) {
        return cleanPath;
      }
      // If logging in from the customer side (/s/...), customer portal (/me), or home (/),
      // an administrator must be routed to their HQ Admin dashboard.
      return "/admin";
    }

    case "SALON_OWNER": {
      // Salon Owner routes to owner management portals
      if (cleanPath.startsWith("/owner")) {
        return cleanPath;
      }
      // If from chair station (/s/.../station), owner can monitor it
      if (cleanPath.includes("/station")) {
        return cleanPath;
      }
      // If logging in from the customer side (/s/...), admin, /me, or root (/),
      // a salon owner must be routed to their Owner Operations Portal
      return extractedSlug ? `/owner?salon=${extractedSlug}` : "/owner";
    }

    case "STAFF": {
      // Stylist / Barber routes to their dedicated staff panel or station desk
      if (cleanPath.startsWith("/staff") || cleanPath.includes("/station")) {
        return cleanPath;
      }
      return "/staff";
    }

    case "CUSTOMER": {
      // Customer belongs on customer-facing pages
      // 1. If visiting a public salon storefront (/s/[slug]), keep customer on that storefront
      const isPublicStorefront =
        cleanPath.startsWith("/s/") &&
        !cleanPath.includes("/station") &&
        !cleanPath.includes("/desk") &&
        !cleanPath.includes("/barber");

      if (isPublicStorefront) {
        return cleanPath;
      }

      // 2. Customer profile and ticket portal (/me)
      if (cleanPath.startsWith("/me")) {
        return cleanPath;
      }

      // 3. If from a station desk (/s/:slug/station), route customer to that salon's public door
      if (cleanPath.includes("/station") && extractedSlug) {
        return `/s/${extractedSlug}`;
      }

      // 4. Default for any other protected route (/admin, /owner) or general landing -> customer portal
      return "/me";
    }

    default:
      return "/login";
  }
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const redirectUrl = getLoginRedirectForPath(pathname);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(redirectUrl);
    }
  }, [isLoading, user, redirectUrl, router]);

  // State 1: Resolving authentication
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4" role="status">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
          <Loader2 className="h-6 w-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-slate-200">Verifying session credentials...</p>
          <p className="text-xs text-slate-500">Connecting to Engine Que zero-trust boundary</p>
        </div>
      </div>
    );
  }

  // State 2: Unauthenticated
  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-rose-900/40 bg-slate-900/90 shadow-2xl shadow-rose-950/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-rose-400" />
            </div>
            <CardTitle className="text-xl font-bold text-white">Access Denied</CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              This protected sector requires authenticated enterprise access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-xs text-slate-400">
              Please authenticate using your system credentials to continue.
            </p>
            <div className="pt-2">
              <Link
                href={redirectUrl}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-600/25"
              >
                Sign In to Access
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 3: Role Mismatch
  const isRoleAllowed = !requiredRole
    ? true
    : Array.isArray(requiredRole)
    ? requiredRole.includes(user.role as AllowedRole)
    : user.role === requiredRole;

  if (!isRoleAllowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-amber-800/40 bg-slate-900/90 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <CardTitle className="text-xl font-bold text-white">Access Restricted</CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              Your account permissions do not match the requirements for this portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Current Role:</span>
                <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                  {user.role}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Required Role:</span>
                <Badge variant="purple" className="text-purple-300">
                  {Array.isArray(requiredRole) ? requiredRole.join(" / ") : requiredRole}
                </Badge>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Button
                variant="outline"
                className="w-full border-slate-700 hover:bg-slate-800 text-white"
                onClick={async () => {
                  await logout();
                  router.push(redirectUrl);
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Switch Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 4: Authorized
  return <>{children}</>;
}
