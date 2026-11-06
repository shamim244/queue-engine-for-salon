import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Tv,
  QrCode,
  Armchair,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  ChevronLeft,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Salon } from "@/lib/api";
import type { OnboardingFormData } from "@/lib/onboarding";

interface StepLaunchKitProps {
  provisionedSalon: Salon;
  formData: OnboardingFormData;
  copiedLink: string | null;
  copyToClipboard: (url: string, key: string) => void;
  resetForm: () => void;
}

export function StepLaunchKit({
  provisionedSalon,
  formData,
  copiedLink,
  copyToClipboard,
  resetForm,
}: StepLaunchKitProps) {
  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-400">
      {/* Success Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Tenant Onboarded & Active in Engine Core
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {provisionedSalon.name} is Live!
            </h2>
            <p className="text-slate-300 text-sm max-w-xl">
              Instance <span className="font-mono text-emerald-400">{provisionedSalon.id}</span> provisioned with{" "}
              {provisionedSalon.stylists?.length || formData.stylists.length} active chairs,{" "}
              {provisionedSalon.services?.length || formData.services.length} catalog items, and owner account{" "}
              <span className="font-mono text-blue-300">@{formData.ownerUser.username}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/owner?salon=${provisionedSalon.slug}`}>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 min-h-[44px]">
                Launch Owner Hub →
              </Button>
            </Link>
            <Link href={`/s/${provisionedSalon.slug}/tv`} target="_blank">
              <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800 gap-2 min-h-[44px]">
                <Tv className="h-4 w-4" />
                View Lobby TV
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={resetForm}
              className="text-slate-400 hover:text-white gap-2 min-h-[44px]"
            >
              <RotateCcw className="h-4 w-4" />
              Onboard Another Salon
            </Button>
          </div>
        </div>
      </div>

      {/* Instant Launch Kit - 4 QR Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-400" />
              Instant Launch Kit & Deployment QR Cards
            </h3>
            <p className="text-xs text-slate-400">
              Deploy these 4 operational endpoints immediately across door, waiting lobby, cutting chairs, and manager desk.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Door QR Check-in */}
          <Card className="bg-slate-900/80 border-slate-800 flex flex-col justify-between hover:border-blue-500/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="text-[10px] px-2 py-0">
                  Door Entrance
                </Badge>
                <QrCode className="h-4 w-4 text-blue-400" />
              </div>
              <CardTitle className="text-base text-white mt-2">Customer Check-in</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Print on shop door. Customers scan without app install to join queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-center">
                <div className="h-28 w-28 bg-white p-2 rounded-lg flex flex-col items-center justify-center text-slate-900 font-mono text-[10px] text-center shadow-inner">
                  <QrCode className="h-20 w-20 text-slate-950" />
                  <span>/s/{provisionedSalon.slug}</span>
                </div>
              </div>
              <p className="text-xs font-mono text-blue-400 text-center truncate">
                /s/{provisionedSalon.slug}
              </p>
            </CardContent>
            <CardFooter className="pt-0 flex items-center gap-2">
              <Link href={`/s/${provisionedSalon.slug}`} target="_blank" className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-slate-700 min-h-[44px]">
                  Open Door UI
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `${typeof window !== "undefined" ? window.location.origin : ""}/s/${provisionedSalon.slug}`,
                    "door"
                  )
                }
                className="h-11 w-11 p-0 text-slate-400 hover:text-white shrink-0"
              >
                {copiedLink === "door" ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Card 2: Lobby TV Departure Board */}
          <Card className="bg-slate-900/80 border-slate-800 flex flex-col justify-between hover:border-purple-500/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="purple" className="text-[10px] px-2 py-0">
                  Waiting Lobby
                </Badge>
                <Tv className="h-4 w-4 text-purple-400" />
              </div>
              <CardTitle className="text-base text-white mt-2">Lobby TV Display</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Airport departure style queue board. Open in browser on smart TV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-center">
                <div className="h-28 w-28 bg-white p-2 rounded-lg flex flex-col items-center justify-center text-slate-900 font-mono text-[10px] text-center shadow-inner">
                  <Tv className="h-20 w-20 text-slate-950" />
                  <span>/tv</span>
                </div>
              </div>
              <p className="text-xs font-mono text-purple-400 text-center truncate">
                /s/{provisionedSalon.slug}/tv
              </p>
            </CardContent>
            <CardFooter className="pt-0 flex items-center gap-2">
              <Link href={`/s/${provisionedSalon.slug}/tv`} target="_blank" className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-slate-700 min-h-[44px]">
                  Launch TV View
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `${typeof window !== "undefined" ? window.location.origin : ""}/s/${provisionedSalon.slug}/tv`,
                    "tv"
                  )
                }
                className="h-11 w-11 p-0 text-slate-400 hover:text-white shrink-0"
              >
                {copiedLink === "tv" ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Card 3: Stylist Mirror / Chair UI */}
          <Card className="bg-slate-900/80 border-slate-800 flex flex-col justify-between hover:border-indigo-500/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="text-[10px] px-2 py-0">
                  Cutting Station
                </Badge>
                <Armchair className="h-4 w-4 text-indigo-400" />
              </div>
              <CardTitle className="text-base text-white mt-2">Chair / Station UI</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Mount phone or tablet next to mirror. Stylists call next with 4-digit PIN.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-center">
                <div className="h-28 w-28 bg-white p-2 rounded-lg flex flex-col items-center justify-center text-slate-900 font-mono text-[10px] text-center shadow-inner">
                  <Armchair className="h-20 w-20 text-slate-950" />
                  <span>/station</span>
                </div>
              </div>
              <p className="text-xs font-mono text-indigo-400 text-center truncate">
                /s/{provisionedSalon.slug}/station
              </p>
            </CardContent>
            <CardFooter className="pt-0 flex items-center gap-2">
              <Link href={`/s/${provisionedSalon.slug}/station`} target="_blank" className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-slate-700 min-h-[44px]">
                  Open Station UI
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `${typeof window !== "undefined" ? window.location.origin : ""}/s/${provisionedSalon.slug}/station`,
                    "station"
                  )
                }
                className="h-11 w-11 p-0 text-slate-400 hover:text-white shrink-0"
              >
                {copiedLink === "station" ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Card 4: Owner Command Hub */}
          <Card className="bg-slate-900/80 border-slate-800 flex flex-col justify-between hover:border-emerald-500/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="success" className="text-[10px] px-2 py-0">
                  Management
                </Badge>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <CardTitle className="text-base text-white mt-2">Owner Command Hub</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Owner operations dashboard for daily metrics, shift toggles, and revenue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-center">
                <div className="h-28 w-28 bg-white p-2 rounded-lg flex flex-col items-center justify-center text-slate-900 font-mono text-[10px] text-center shadow-inner">
                  <ShieldCheck className="h-20 w-20 text-slate-950" />
                  <span>/owner</span>
                </div>
              </div>
              <p className="text-xs font-mono text-emerald-400 text-center truncate">
                /owner?salon={provisionedSalon.slug}
              </p>
            </CardContent>
            <CardFooter className="pt-0 flex items-center gap-2">
              <Link href={`/owner?salon=${provisionedSalon.slug}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-slate-700 min-h-[44px]">
                  Launch Hub
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `${typeof window !== "undefined" ? window.location.origin : ""}/owner?salon=${provisionedSalon.slug}`,
                    "owner"
                  )
                }
                className="h-11 w-11 p-0 text-slate-400 hover:text-white shrink-0"
              >
                {copiedLink === "owner" ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Action Row */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/admin/tenants">
          <Button variant="outline" className="gap-2 border-slate-700 text-slate-300 min-h-[44px]">
            <ChevronLeft className="h-4 w-4" />
            Return to Tenant Directory
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <Button onClick={resetForm} variant="ghost" className="gap-2 text-slate-300 min-h-[44px]">
            <RotateCcw className="h-4 w-4" />
            Onboard Another Salon
          </Button>
          <Link href={`/owner?salon=${provisionedSalon.slug}`}>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold min-h-[44px]">
              Launch Owner Hub →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
