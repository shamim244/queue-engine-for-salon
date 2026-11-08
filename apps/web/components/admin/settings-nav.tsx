"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Palette, Cpu, ShieldCheck, Zap } from "lucide-react";

export function SettingsNav() {
  const pathname = usePathname();

  const tabs = [
    { label: "General", href: "/admin/settings", icon: Settings },
    { label: "Compression & Caching", href: "/admin/settings/compression", icon: Zap },
    { label: "Appearance", href: "/admin/settings/appearance", icon: Palette },
    { label: "System Engine & Gateways", href: "/admin/settings/system", icon: Cpu },
    { label: "Security & Audit", href: "/admin/security", icon: ShieldCheck },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${
              isActive
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
