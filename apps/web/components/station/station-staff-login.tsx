"use client";

import React, { useState } from "react";
import { User, Lock, Eye, EyeOff, LogIn, Armchair, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Salon, Stylist } from "@/lib/api";

interface StationStaffLoginProps {
  salon: Salon | null;
  onLogin: (identifier: string, password: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export function StationStaffLogin({
  salon,
  onLogin,
  isLoading,
  error: initialError,
}: StationStaffLoginProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your username/phone and password.");
      return;
    }
    setError(null);
    try {
      await onLogin(identifier.trim(), password);
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please verify username and password.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in duration-300">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-xl shadow-blue-500/20 mx-auto">
            <Armchair className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Staff Chair Station
          </h1>
          <p className="text-xs text-slate-400">
            {salon?.name || "Salon"} · Enter your staff account credentials
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Username, Phone, or Email
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="e.g. rahul, +91 98765 43210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10 h-11 bg-slate-950 border-slate-800 text-white text-xs rounded-xl focus:border-blue-500"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter staff password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-slate-950 border-slate-800 text-white text-xs rounded-xl focus:border-blue-500"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 transition-all mt-2"
            >
              <LogIn className="h-4 w-4 mr-2" />
              <span>{isLoading ? "Signing in to Chair..." : "Sign In to Chair Station"}</span>
            </Button>
          </form>

          {/* Salon Staff Roster Helper for Quick Test / Demo */}
          {salon?.stylists && salon.stylists.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Active Staff Chairs in this Salon
              </span>
              <div className="grid grid-cols-2 gap-2">
                {salon.stylists.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setIdentifier(st.phone || st.name.toLowerCase().replace(/\s+/g, ""));
                      setPassword("barber123");
                    }}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-800/60 text-left transition-all group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-blue-300">
                      {st.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Chair #{st.id.slice(-2)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-[11px] text-slate-500">
              Each staff member signs in to their own chair. Sessions remain strictly isolated across devices with zero collision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
