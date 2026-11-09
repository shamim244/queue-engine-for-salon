"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell,
  MessageSquare,
  Send,
  ChevronRight,
  CheckCircle2,
  Phone,
  Radio,
} from "lucide-react";

export default function CommunicationsHubPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-yellow-400 font-medium">Communications Hub</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            🔔 Communications Hub (WhatsApp & SMS)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure automated WhatsApp notifications, queue turn alerts, and SMS gateway failovers across all salons.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp Cloud API */}
        <Card className="border-emerald-500/30 bg-slate-900/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageSquare className="h-5 w-5" />
                <CardTitle className="text-base text-white">Meta WhatsApp Cloud API</CardTitle>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                Active
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              High-deliverability queue turn notifications, e-receipts, and ticket tracking links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-slate-200">Queue Ready Template:</div>
              <div className="text-slate-400 italic font-mono text-[11px]">
                "Hello {"{{name}}"}, your chair with barber {"{{barber}}"} is ready in 5 mins at {"{{salon}}"}! Live ticket: {"{{link}}"}"
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMS Failover */}
        <Card className="border-blue-500/30 bg-slate-900/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <Radio className="h-5 w-5" />
                <CardTitle className="text-base text-white">DLT SMS Gateway (India)</CardTitle>
              </div>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">
                Configured
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Fallback delivery channel for rural 2G/3G regions when WhatsApp is unreachable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-slate-200">DLT Registered Header:</div>
              <div className="text-slate-300 font-mono text-[11px]">SALONQ (Transactional)</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}