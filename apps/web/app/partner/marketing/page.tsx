"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { getStoredPartner, partnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Copy,
  Check,
  Download,
  Share2,
  Printer,
  Sparkles,
  Scissors,
  CheckCircle2,
  HelpCircle,
  QrCode,
  MessageCircle,
  Languages,
  Loader2,
  ExternalLink,
} from "lucide-react";

export default function PartnerMarketingPage() {
  const [partner, setPartner] = useState<any>(null);
  const [marketingContent, setMarketingContent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"hindi" | "english" | "whatsapp">("hindi");
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const p = getStoredPartner();
    if (p) setPartner(p);

    const loadContent = async () => {
      try {
        const res = await partnerApi.getMarketingContent();
        if (res.success && res.content) {
          setMarketingContent(res.content);
        }
      } catch (err) {
        console.error("Error loading partner marketing collateral:", err);
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadContent();
  }, []);

  const referralCode = partner?.referralCode || "PARTNER";
  const partnerName = partner?.fullName || "Field Partner";

  // Standee QR Code render (Client-side HTML5 canvas per memory rule)
  useEffect(() => {
    if (qrCanvasRef.current && typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/register?ref=${referralCode}`;
      QRCode.toCanvas(
        qrCanvasRef.current,
        shareUrl,
        {
          width: 170,
          margin: 1,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        },
        (err) => {
          if (err) console.error("QR Code generation error:", err);
        }
      );
    }
  }, [referralCode]);

  // Dynamic texts with fallbacks
  const hindiScript =
    marketingContent?.pitchScriptHindi ||
    `Namaste Bhai Sahab! Main Engine Que se hoon. 

Aapke salon mein Sunday ko bohot bheed hoti hai na? Customers wait karke doosri dukaan pe chale jaate hain.

Hum aapke salon ko 2 minute mein digital bana dete hain:
1. Customer bahar se hi WhatsApp ya QR scan karke apna queue number le sakta hai.
2. Chair khali hone se 3 minute pehle customer ko automatic WhatsApp alert milta hai.
3. Chote haircuts se leke advance appointments aur UPI receipts sab auto manage hota hai!

Aapka 1 bhi customer wait karke wapas nahi lautega. Chaliye main aapke phone pe abhi 2 minute mein live karke dikhaata hoon!`;

  const englishScript =
    marketingContent?.pitchScriptEnglish ||
    `Hello Sir! I am representing Engine Que Salon Operating System.

We help busy neighborhood salons eliminate waiting congestion and stop losing impatient customers to competitors.

In under 2 minutes, we set up your salon with:
1. Instant QR/WhatsApp queue ticketing for walk-in clients.
2. Automated SMS/WhatsApp chair-readiness alerts.
3. Live real-time dashboard on any Android smartphone.

Zero setup fees and no extra hardware required. Let me show you a 60-second live demo right now!`;

  const rawWhatsapp =
    marketingContent?.whatsappInviteTemplate ||
    `Namaste! Engine Que ke sath apne salon ko banaiye 100% digital aur automatic:
- Live QR Queue & WhatsApp Chair Alerts
- No App Download needed for customers
- Free Trial available!

Onboard karein: https://engineque.in/register?ref={PARTNER_CODE}
Code: {PARTNER_CODE} (Special Partner Benefit)`;

  const resolvedWhatsapp = rawWhatsapp
    .replace(/{PARTNER_CODE}/g, referralCode)
    .replace(/{PARTNER_NAME}/g, partnerName);

  const objectionHandling = Array.isArray(marketingContent?.objectionHandling) && marketingContent.objectionHandling.length > 0
    ? marketingContent.objectionHandling
    : [
        {
          question: "Bhaiya hum computer use nahi karte, humse nahi hoga.",
          answer: "Bilkul computer nahi chahiye! Yeh poora aapke aur customer ke normal Android phone pe chalta hai, simple WhatsApp jaisa aasan.",
        },
        {
          question: "Kharcha kitna hai? Koi hidden fee toh nahi?",
          answer: "Pehla mahina bilkul free hai! Setup hum abhi 2 minute mein free mein karke denge. Jab faayda dikhe tab hi sochiye.",
        },
        {
          question: "Hamare customers purane hain, unko samajh aayega?",
          answer: "Customer ko koi app download nahi karni padti. Bas camera se scan ya WhatsApp pe 'Hi' bhejte hi unka ticket number mil jaata hai.",
        },
      ];

  const posterHeadline = marketingContent?.posterHeadline || "SKIP THE WAITING LOUNGE!";
  const posterSubheadline =
    marketingContent?.posterSubheadline ||
    "Scan with camera or Paytm/GPay to view live queue & get WhatsApp chair alert.";
  const posterBullets = Array.isArray(marketingContent?.posterBulletPoints) && marketingContent.posterBulletPoints.length > 0
    ? marketingContent.posterBulletPoints
    : ["Live Queue Tracker", "WhatsApp Turn Alert", "Zero App Download Required"];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(key);
    setTimeout(() => setCopiedState(null), 2000);
  };

  const handleShareWhatsapp = () => {
    const encoded = encodeURIComponent(resolvedWhatsapp);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const handlePrintStandee = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Badge variant="outline" className="border-blue-500/40 text-blue-300 bg-blue-500/10 text-xs mb-1.5">
          Partner Field Kit
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Pitch Materials & Standees
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Everything you need to pitch neighborhood salons in person or share invite links online.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Pitch Scripts & WhatsApp Templates */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>60-Second In-Shop Pitch Script</span>
            </h2>
          </div>

          {/* Tabs Switcher */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveTab("hindi")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "hindi" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                Hindi Script
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("english")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "english" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                English Script
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("whatsapp")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "whatsapp" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                WhatsApp
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text =
                  activeTab === "hindi" ? hindiScript : activeTab === "english" ? englishScript : resolvedWhatsapp;
                handleCopy(text, activeTab);
              }}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs h-8 gap-1.5"
            >
              {copiedState === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>

          {/* Script Content Area */}
          <div>
            {activeTab === "hindi" && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                  <span>60-Second In-Shop Pitch (Hindi / Hinglish)</span>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px]">
                    Recommended
                  </Badge>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                  {hindiScript}
                </div>
              </div>
            )}

            {activeTab === "english" && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
                  <span>Executive Pitch (English)</span>
                  <Badge variant="outline" className="border-blue-500/40 text-blue-300 text-[10px]">
                    Formal
                  </Badge>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                  {englishScript}
                </div>
              </div>
            )}

            {activeTab === "whatsapp" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                  <span>Direct WhatsApp Broadcast Message</span>
                  <Button
                    size="sm"
                    onClick={handleShareWhatsapp}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-7 gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Open in WhatsApp</span>
                  </Button>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-line leading-relaxed font-mono">
                  {resolvedWhatsapp}
                </div>
              </div>
            )}
          </div>

          {/* Objections Handling Accordion / Cards */}
          <div className="pt-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>Objection Handling Guide</span>
            </h3>

            <div className="space-y-2 text-xs">
              {objectionHandling.map((item: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="font-semibold text-amber-300 block">
                    &ldquo;{item.question}&rdquo;
                  </span>
                  <span className="text-slate-400 block leading-relaxed">
                    Response: &ldquo;{item.answer}&rdquo;
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Printable Counter Standee Preview */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <span>Printable Partner Standee Card</span>
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintStandee}
                className="text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white gap-1.5 h-8"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Standee</span>
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Print this on A5 or 4x6 acrylic standee to place on the salon billing reception counter.
            </p>
          </div>

          {/* Standee Mockup Container */}
          <div className="p-6 rounded-2xl bg-white text-slate-950 border-4 border-amber-500 shadow-2xl text-center space-y-3 max-w-xs mx-auto my-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black tracking-tight text-slate-900">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                EQ
              </div>
              <span>ENGINE QUE SALON</span>
            </div>

            <div className="text-base font-extrabold text-slate-900 leading-tight">
              {posterHeadline}
            </div>
            <p className="text-[11px] text-slate-600">
              {posterSubheadline}
            </p>

            <div className="flex justify-center py-1">
              <canvas ref={qrCanvasRef} width={170} height={170} className="rounded-lg shadow-sm" />
            </div>

            <div className="bg-slate-100 rounded-lg py-1 px-2 text-[10px] font-mono font-bold text-slate-800">
              PROMO CODE: {referralCode}
            </div>

            <div className="space-y-0.5 text-left bg-slate-50 p-2 rounded-lg border border-slate-200">
              {posterBullets.map((bullet: string, i: number) => (
                <div key={i} className="text-[10px] text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <div className="text-[9px] text-slate-500">
              Supported on all Android & iPhone devices. No app download needed.
            </div>
          </div>

          <div className="pt-2 text-center text-xs text-slate-500">
            Assisted Attribution Code: <span className="font-mono text-amber-400 font-bold">{referralCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
