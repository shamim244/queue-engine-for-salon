"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Radio,
  LogOut,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, demoLogin } = useAuth();

  const navItems = [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Tenant Directory", href: "/admin/tenants", icon: Building2 },
    { label: "Onboard Salon", href: "/admin/onboarding", icon: Sparkles },
    { label: "Subscription Tiers", href: "/admin/billing", icon: CreditCard },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20">
              EQ
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
                Super Admin
                <Badge variant="purple" className="text-[10px] px-1.5 py-0">HQ</Badge>
              </h1>
              <p className="text-xs text-slate-400">Queue Engine Platform</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">Bun Core 3001</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 opacity-75" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer auth control */}
        <div className="pt-6 border-t border-slate-800/80 space-y-3">
          {user ? (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-between">
              <div className="truncate mr-2">
                <p className="text-xs font-semibold text-white truncate">
                  {user.username || "Super Administrator"}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="purple" className="text-[10px] px-1.5 py-0 font-mono tracking-wider">
                    {user.role}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
                className="shrink-0 hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4 text-slate-400 hover:text-rose-400" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full text-xs gap-1.5 border-dashed"
              onClick={() => demoLogin("SUPER_ADMIN")}
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              Quick Super Admin Auth
            </Button>
          )}

          <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
            <Link href="/" className="hover:text-blue-400 transition-colors">
              &larr; Main Launcher
            </Link>
            <span>v1.4.3 decoupled</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area Protected by AuthGuard */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl">
        <AuthGuard requiredRole="SUPER_ADMIN">
          {children}
        </AuthGuard>
      </main>
    </div>
  );
}
