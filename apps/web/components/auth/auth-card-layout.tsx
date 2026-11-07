"use client";

import React from "react";
import Link from "next/link";
import { Scissors } from "lucide-react";

interface AuthCardLayoutProps {
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  theme?: "obsidian" | "gold" | "blue";
}

export function AuthCardLayout({
  badge,
  icon,
  title,
  description,
  children,
  footer,
  theme = "blue",
}: AuthCardLayoutProps) {
  const themeCardStyles = {
    obsidian: "bg-slate-900/95 border-slate-800 shadow-2xl shadow-slate-950/60",
    gold: "bg-slate-900/95 border-slate-800 shadow-2xl shadow-slate-950/60",
    blue: "bg-slate-900/95 border-slate-800 shadow-2xl shadow-slate-950/60",
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 relative">
      <div className="w-full max-w-md mx-auto">
        {/* Salon brand header */}
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors group mb-3"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 group-hover:scale-105 transition-transform">
              <Scissors className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-bold tracking-tight text-white text-base">Engine Que</span>
          </Link>
        </div>

        {/* Auth card container */}
        <div
          className={`rounded-2xl border backdrop-blur-xl p-6 sm:p-8 ${themeCardStyles[theme]}`}
        >
          <div className="text-center mb-6 space-y-2">
            {badge && <div className="flex justify-center mb-2">{badge}</div>}
            {icon && <div className="flex justify-center text-slate-200">{icon}</div>}
            <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
            <p className="text-sm text-slate-400">{description}</p>
          </div>

          {children}

          {footer && (
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
