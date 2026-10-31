"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Salon } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Copy,
  ExternalLink,
  QrCode,
  Tv,
  Armchair,
  Check,
  Scissors,
  Smartphone,
  Coffee,
  BellRing,
} from "lucide-react";

function OwnerLinksAndPosterContent() {
  const searchParams = useSearchParams();
  const { salon } = useAuth();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const currentSlug = salon?.slug || searchParams.get("salon") || "salon-rural-01";
  const [origin, setOrigin] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const doorQrUrl = `${origin}/s/${currentSlug}`;
  const lobbyTvUrl = `${origin}/s/${currentSlug}/tv`;
  const chairStationUrl = `${origin}/s/${currentSlug}/station`;

  // QR Code SVG generator using Google Chart API / QR Server
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
    doorQrUrl
  )}&format=svg&margin=10`;

  const copyToClipboard = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Screen Only Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Printable Mirror Posters & Vanity Links
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Display physical Door QR posters at your entrance or mirror for instant guest check-in.
          </p>
        </div>

        <Button
          onClick={handlePrint}
          size="lg"
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20"
        >
          <Printer className="h-5 w-5" />
          Print A4 Mirror Poster
        </Button>
      </div>

      {/* Touchpoint Links Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <Card className="p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Customer Door QR</p>
              <p className="text-[11px] text-slate-400">Scan at entrance to join queue</p>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 truncate">
            {doorQrUrl}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 gap-1.5"
              onClick={() => copyToClipboard(doorQrUrl, "qr")}
            >
              {copiedLink === "qr" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink === "qr" ? "Copied!" : "Copy Link"}
            </Button>
            <a href={doorQrUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary" className="h-8 px-2.5">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Lobby TV Board</p>
              <p className="text-[11px] text-slate-400">For lounge wall Smart TV</p>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-blue-400 truncate">
            {lobbyTvUrl}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 gap-1.5"
              onClick={() => copyToClipboard(lobbyTvUrl, "tv")}
            >
              {copiedLink === "tv" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink === "tv" ? "Copied!" : "Copy Link"}
            </Button>
            <a href={lobbyTvUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary" className="h-8 px-2.5">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Armchair className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Staff Chair Working Station</p>
              <p className="text-[11px] text-slate-400">Tablet mirror mount UI</p>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-400 truncate">
            {chairStationUrl}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 gap-1.5"
              onClick={() => copyToClipboard(chairStationUrl, "chair")}
            >
              {copiedLink === "chair" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink === "chair" ? "Copied!" : "Copy Link"}
            </Button>
            <a href={chairStationUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary" className="h-8 px-2.5">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </Card>
      </div>

      {/* A4 Minimalist Printable Mirror Poster */}
      <div className="max-w-xl mx-auto bg-white text-slate-950 p-8 sm:p-12 rounded-3xl shadow-2xl border-4 border-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-center space-y-8">
        {/* Salon Branding Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-slate-950 text-white mx-auto shadow-md">
            <Scissors className="h-7 w-7 text-amber-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-slate-950">
            {salon?.name || "Royal Barbers"}
          </h2>
          <p className="text-xs uppercase tracking-widest font-bold text-slate-600">
            Skip The Waiting Lounge • Live Digital Queue
          </p>
        </div>

        {/* Big Crisp QR Code Container */}
        <div className="p-6 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 max-w-xs mx-auto shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageSrc}
            alt="Door QR Code"
            className="w-64 h-64 mx-auto rounded-xl shadow-md"
          />
          <p className="text-[11px] font-mono text-slate-500 mt-3 font-semibold">
            {doorQrUrl}
          </p>
        </div>

        {/* 3 Step Visual Instructions */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-left">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs mx-auto">
              1
            </div>
            <p className="font-bold text-xs text-slate-900">Scan QR Code</p>
            <p className="text-[10px] text-slate-600 leading-tight">
              Open phone camera & tap the notification.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs mx-auto">
              2
            </div>
            <p className="font-bold text-xs text-slate-900">Grab a Chai</p>
            <p className="text-[10px] text-slate-600 leading-tight">
              Pick your service & relax at the tea stall nearby.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs mx-auto">
              3
            </div>
            <p className="font-bold text-xs text-slate-900">We Alert You</p>
            <p className="text-[10px] text-slate-600 leading-tight">
              WhatsApp & audio buzzer when your chair is ready!
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Contact: {salon?.phone || "+91 98765 43210"}</span>
          <span>Powered by Engine Que System</span>
        </div>
      </div>
    </div>
  );
}

export default function OwnerLinksAndPosterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Posters...</div>}>
      <OwnerLinksAndPosterContent />
    </Suspense>
  );
}
