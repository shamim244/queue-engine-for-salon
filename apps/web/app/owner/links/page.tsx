"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Salon } from "@/lib/api";
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
  IndianRupee,
  Sparkles,
} from "lucide-react";

function OwnerLinksAndPosterContent() {
  const searchParams = useSearchParams();
  const { salon } = useAuth();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const currentSlug = salon?.slug || searchParams.get("salon") || "ramesh-barber";
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>("");
  const [includeUpi, setIncludeUpi] = useState<boolean>(Boolean(salon?.upiPaymentId));

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const doorQrUrl = `${origin}/s/${currentSlug}`;
  const lobbyTvUrl = `${origin}/s/${currentSlug}/tv`;
  const chairStationUrl = `${origin}/s/${currentSlug}/station`;

  // Offline-capable client-side QR generation
  useEffect(() => {
    QRCode.toDataURL(doorQrUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#020617",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code generation error:", err));

    if (salon?.upiPaymentId) {
      const upiUrl = `upi://pay?pa=${salon.upiPaymentId}&pn=${encodeURIComponent(salon.name)}&cu=INR`;
      QRCode.toDataURL(upiUrl, {
        width: 250,
        margin: 2,
        color: {
          dark: "#020617",
          light: "#ffffff",
        },
      })
        .then((url) => setUpiQrDataUrl(url))
        .catch((err) => console.error("UPI QR error:", err));
    }
  }, [doorQrUrl, salon?.upiPaymentId, salon?.name]);

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

        <div className="flex items-center gap-3">
          {salon?.upiPaymentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIncludeUpi(!includeUpi)}
              className="text-xs gap-1.5 border-slate-700"
            >
              <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
              {includeUpi ? "Hide Counter UPI QR" : "Show Counter UPI QR"}
            </Button>
          )}

          <Button
            onClick={handlePrint}
            size="lg"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20"
          >
            <Printer className="h-5 w-5" />
            Print A4 Mirror Poster
          </Button>
        </div>
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
      <div className="max-w-xl mx-auto bg-white text-slate-950 p-8 sm:p-12 rounded-3xl shadow-2xl border-4 border-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-center space-y-7">
        {/* Salon Branding Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-slate-950 text-white mx-auto shadow-md">
            <Scissors className="h-7 w-7 text-amber-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-slate-950">
            {salon?.name || "Royal Barbers"}
          </h2>
          <p className="text-xs uppercase tracking-widest font-extrabold text-slate-600">
            डिजिटल टोकन • लाइव डिजिटल कतार / Live Digital Queue
          </p>
        </div>

        {/* Big Crisp QR Code Container (Generated Offline) */}
        <div className="p-5 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 max-w-xs mx-auto shadow-inner space-y-2">
          {qrDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrDataUrl}
              alt="Door QR Code"
              className="w-64 h-64 mx-auto rounded-xl shadow-md"
            />
          ) : (
            <div className="w-64 h-64 mx-auto bg-slate-200 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-500">
              Generating Vector QR...
            </div>
          )}
          <p className="text-[11px] font-mono text-slate-500 font-semibold truncate">
            {doorQrUrl}
          </p>
        </div>

        {/* 3 Step Visual Bilingual Instructions */}
        <div className="grid grid-cols-3 gap-3 pt-1 text-center">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="h-8 w-8 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-xs mx-auto">
              1
            </div>
            <p className="font-bold text-xs text-slate-900">QR स्कैन करें</p>
            <p className="text-[10px] text-slate-500 font-medium">Scan with camera</p>
            <p className="text-[10px] text-slate-600 leading-tight pt-1">
              फोन कैमरा से QR कोड स्कैन करें और टोकन लें।
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="h-8 w-8 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-xs mx-auto">
              2
            </div>
            <p className="font-bold text-xs text-slate-900">चाय या नाश्ता लें</p>
            <p className="text-[10px] text-slate-500 font-medium">Grab a Chai & Relax</p>
            <p className="text-[10px] text-slate-600 leading-tight pt-1">
              लाइन में खड़े रहने की जरूरत नहीं, आसपास आराम करें।
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="h-8 w-8 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-xs mx-auto">
              3
            </div>
            <p className="font-bold text-xs text-slate-900">WhatsApp अलर्ट</p>
            <p className="text-[10px] text-slate-500 font-medium">We WhatsApp You</p>
            <p className="text-[10px] text-slate-600 leading-tight pt-1">
              कुर्सी तैयार होते ही मोबाइल पर WhatsApp मैसेज आएगा।
            </p>
          </div>
        </div>

        {/* Optional UPI QR Code for Counter Payments */}
        {includeUpi && upiQrDataUrl && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider bg-emerald-200/60 px-2 py-0.5 rounded">
                Direct UPI Counter Payment
              </span>
              <p className="text-xs font-bold text-slate-900">
                GPay / PhonePe / Paytm Accepted
              </p>
              <p className="text-[11px] font-mono text-emerald-700">
                UPI ID: {salon?.upiPaymentId}
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={upiQrDataUrl}
              alt="UPI QR Code"
              className="w-20 h-20 rounded-lg border border-emerald-300 shadow-sm shrink-0"
            />
          </div>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>हेल्पलाइन / Phone: {salon?.phone || "+91 98765 43210"}</span>
          <span className="font-bold text-slate-700">Engine Que System</span>
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
