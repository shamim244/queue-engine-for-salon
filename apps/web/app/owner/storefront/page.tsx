"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Salon } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PhoneInput, DEFAULT_COUNTRIES } from "@/components/ui/phone-input";
import QRCode from "qrcode";
import {
  Store,
  ExternalLink,
  Save,
  CheckCircle2,
  Sparkles,
  MapPin,
  Phone,
  Clock,
  Mail,
  Instagram,
  QrCode,
  ShieldCheck,
  Megaphone,
  Check,
  Plus,
  Trash2,
  Wifi,
  Sun,
  Eye,
  MessageCircle,
} from "lucide-react";

const STANDARD_AMENITIES = [
  "Air Conditioned",
  "High-Speed Wi-Fi",
  "Complimentary Chai",
  "Artisan Coffee & Tea",
  "UPI & Cards Accepted",
  "100% Sanitized Tools",
  "Kids & Family Friendly",
  "Parking Available",
  "Valet Parking",
  "Comfortable Waiting Lounge",
  "Premium Grooming Products",
  "Private VIP Suites",
];

function OwnerStorefrontContent() {
  const searchParams = useSearchParams();
  const { salon: authSalon, setSelectedSalon } = useAuth();

  const currentSlug = authSalon?.slug || searchParams.get("salon") || "ramesh-barber";
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [address, setAddress] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("+91");
  const [sameAsCallingPhone, setSameAsCallingPhone] = useState(false);
  const [email, setEmail] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [upiPaymentId, setUpiPaymentId] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [enableLoungeWifi, setEnableLoungeWifi] = useState(true);
  const [enableScreenWakeLock, setEnableScreenWakeLock] = useState(true);

  // Live UPI QR Canvas Ref
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const parsePhoneInput = (raw: string) => {
    if (!raw) return { code: "+91", national: "" };
    let code = "+91";
    let digits = raw.replace(/\D/g, "");
    if (raw.startsWith("+")) {
      for (const c of DEFAULT_COUNTRIES) {
        if (raw.startsWith(c.code)) {
          code = c.code;
          digits = raw.slice(c.code.length).replace(/\D/g, "");
          break;
        }
      }
    } else if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2);
    }
    return { code, national: digits.slice(0, 10) };
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function loadSalonData() {
      try {
        setLoading(true);
        const res = await api.salons.get(currentSlug);
        if (res?.salon) {
          const s = res.salon;
          setSalon(s);
          setName(s.name || "");
          setTagline(s.tagline || "");
          setAbout(s.about || "");
          setOperatingHours(s.operatingHours || "Mon - Sat: 8:00 AM – 9:00 PM | Sun: 8:00 AM – 2:00 PM");
          setAddress(s.address || "");
          setGoogleMapsUrl(s.googleMapsUrl || "");

          const parsedPhone = parsePhoneInput(s.phone || "");
          setPhone(parsedPhone.national);
          setPhoneCountryCode(parsedPhone.code);

          const parsedWA = parsePhoneInput(s.whatsappPhone || s.phone || "");
          setWhatsappPhone(parsedWA.national);
          setWhatsappCountryCode(parsedWA.code);
          setSameAsCallingPhone(Boolean(s.whatsappPhone && s.phone && s.whatsappPhone === s.phone));

          setEmail(s.email || "");
          setInstagramHandle(s.instagramHandle || "");
          setUpiPaymentId(s.upiPaymentId || "");
          setAnnouncement(s.announcement || "");
          setAnnouncementActive(Boolean(s.announcementActive));
          setWifiSsid(s.wifiSsid || "");
          setWifiPassword(s.wifiPassword || "");
          setEnableLoungeWifi(s.enableLoungeWifi !== false);
          setEnableScreenWakeLock(s.enableScreenWakeLock !== false);
          setAmenities(
            s.amenities && s.amenities.length > 0
              ? s.amenities
              : ["Air Conditioned", "High-Speed Wi-Fi", "Complimentary Chai", "UPI & Cards Accepted", "100% Sanitized Tools"]
          );
        }
      } catch (err: any) {
        showToast(err.message || "Failed to load salon details", "error");
      } finally {
        setLoading(false);
      }
    }

    loadSalonData();
  }, [currentSlug]);

  // Client-Side NPCI UPI QR Code Generation (Zero Server Waste)
  useEffect(() => {
    if (!upiPaymentId || !upiPaymentId.includes("@") || !qrCanvasRef.current) return;
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiPaymentId.trim())}&pn=${encodeURIComponent(name.trim() || "Salon")}&cu=INR`;
    QRCode.toCanvas(qrCanvasRef.current, upiUri, {
      width: 140,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }).catch(() => {});
  }, [upiPaymentId, name]);

  const toggleAmenity = (item: string) => {
    if (amenities.includes(item)) {
      setAmenities(amenities.filter((a) => a !== item));
    } else {
      setAmenities([...amenities, item]);
    }
  };

  const handleAddCustomAmenity = () => {
    if (customAmenity.trim() && !amenities.includes(customAmenity.trim())) {
      setAmenities([...amenities, customAmenity.trim()]);
      setCustomAmenity("");
    }
  };

  const handleRemoveAmenity = (item: string) => {
    setAmenities(amenities.filter((a) => a !== item));
  };

  const handleSaveStorefront = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;

    try {
      setSaving(true);
      const cleanPhoneDigits = phone.trim().replace(/\D/g, "").slice(0, 10);
      const formattedPhone = cleanPhoneDigits ? `${phoneCountryCode}${cleanPhoneDigits}` : "";

      const cleanWADigits = sameAsCallingPhone
        ? cleanPhoneDigits
        : whatsappPhone.trim().replace(/\D/g, "").slice(0, 10);
      const formattedWA = sameAsCallingPhone
        ? formattedPhone
        : cleanWADigits
        ? `${whatsappCountryCode}${cleanWADigits}`
        : "";

      const res = await api.salons.update(salon.id, {
        name: name.trim(),
        tagline: tagline.trim(),
        about: about.trim(),
        operatingHours: operatingHours.trim(),
        address: address.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        phone: formattedPhone,
        whatsappPhone: formattedWA,
        email: email.trim(),
        instagramHandle: instagramHandle.trim(),
        upiPaymentId: upiPaymentId.trim(),
        announcement: announcement.trim(),
        announcementActive,
        amenities,
        wifiSsid: wifiSsid.trim(),
        wifiPassword: wifiPassword.trim(),
        enableLoungeWifi,
        enableScreenWakeLock,
      });

      if (res?.salon) {
        setSalon(res.salon);
        setSelectedSalon(res.salon);
        showToast("Landing page & storefront updated successfully!", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save storefront configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading storefront settings...</p>
      </div>
    );
  }

  const liveStorefrontUrl = `/s/${currentSlug}`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Toast Alert Banner */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl transition-all ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-600/50 text-emerald-200"
              : "bg-rose-950/90 border-rose-600/50 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <Sparkles className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1 rounded transition-opacity"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Store className="h-6 w-6 text-amber-400" />
              <span>Landing Page &amp; Digital Storefront</span>
            </h1>
            <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs">
              Public Brand Presence
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Customize the public homepage, about us, contact hours, and announcement alerts that customers see on{" "}
            <code className="text-amber-300 font-mono">/s/{currentSlug}</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={liveStorefrontUrl}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
            <span>View Live Landing Page</span>
          </Link>

          <Button
            onClick={handleSaveStorefront}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black gap-2 shadow-lg shadow-amber-500/20"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Changes..." : "Publish Changes"}</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSaveStorefront} className="space-y-6">
        {/* 0. INTERACTIVE LIVE STOREFRONT PREVIEW CARD */}
        <Card className="border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 shadow-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Interactive Live Preview</span>
                  <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Real-Time Mirror
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Visualizing how customers see your storefront on <code className="text-amber-300 font-mono">/s/{currentSlug}</code>
                </p>
              </div>
            </div>
            <Link
              href={liveStorefrontUrl}
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-blue-400" />
              <span>Open in Tab</span>
            </Link>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* Announcement Alert (if active) */}
            {announcementActive && announcement && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2.5">
                <Megaphone className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="font-medium truncate">{announcement}</span>
              </div>
            )}

            {/* Hero Banner Simulation */}
            <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5">
                    ⭐ 4.9 RATED SALON
                  </Badge>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Accepting Walk-ins
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                  {name || "Your Salon Name"}
                </h3>
                <p className="text-xs sm:text-sm text-amber-300/90 font-medium truncate">
                  {tagline || "Authentic Grooming, Haircut & Luxury Spa"}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                  {address && (
                    <span className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                      <MapPin className="h-3 w-3 text-amber-400" />
                      <span className="truncate max-w-[180px]">{address}</span>
                    </span>
                  )}
                  {operatingHours && (
                    <span className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                      <Clock className="h-3 w-3 text-blue-400" />
                      <span>{operatingHours.split("|")[0]}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Action Buttons Preview */}
              <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                {phone && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span>Call {phoneCountryCode} {phone}</span>
                  </div>
                )}
                {(sameAsCallingPhone ? phone : whatsappPhone) && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>WhatsApp Chat</span>
                  </div>
                )}
                {googleMapsUrl && (
                  <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Map Directions</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 1. ANNOUNCEMENT BANNER */}
        <Card className="border border-slate-800 bg-slate-900/60 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-amber-400" />
                <CardTitle className="text-base text-white">Top Announcement Banner</CardTitle>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                <input
                  type="checkbox"
                  checked={announcementActive}
                  onChange={(e) => setAnnouncementActive(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>Show on Landing Page</span>
              </label>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Display a high-priority alert or promotion banner across the very top of your salon's digital storefront.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="e.g. 🎉 Festive Offer: Free hot towel beard steam with any haircut combo this week!"
              className="bg-slate-950 border-slate-800"
            />
            {announcementActive && announcement && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Preview:</strong> {announcement}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. BRAND HEADLINE & TAGLINE */}
        <Card className="border border-slate-800 bg-slate-900/60 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-base text-white">Brand Identity &amp; Tagline</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              The headline and value proposition that greet visitors in the storefront hero section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Salon Business Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Traditional Barber"
                  className="bg-slate-950 border-slate-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Tagline / Brand Punchline
                </label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Authentic Traditional Barbering, Hot Towel Shaves & Grooming Excellence"
                  className="bg-slate-950 border-slate-800"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. ABOUT US & SALON STORY */}
        <Card className="border border-slate-800 bg-slate-900/60 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-base text-white">About Us &amp; Salon Story</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Tell your customers about your barbering heritage, craftsmanship, cleanliness standards, and why you are the best choice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="e.g. Serving the community for over 15 years with master craftsmanship, hygienic tools, and warm traditional hospitality. Relax in our air-conditioned chairs while we craft your signature cut..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y"
            />
            <p className="text-[11px] text-slate-500">
              Tip: Mention your years of experience, hygiene practices, and comfort amenities.
            </p>
          </CardContent>
        </Card>

        {/* 4. OPERATING HOURS & CONTACT INFORMATION */}
        <Card className="border border-slate-800 bg-slate-900/60 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-base text-white">Operating Hours &amp; Contact Details</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Provide direct contact, navigation, and UPI payment details so customers can reach, find, or pay your salon effortlessly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  <span>Opening Hours</span>
                </label>
                <Input
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  placeholder="e.g. Mon - Sat: 8:00 AM – 9:00 PM | Sun: 8:00 AM – 2:00 PM"
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-400" />
                  <span>Physical Address</span>
                </label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near Main Market, Central Point"
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              {/* Direct Calling Phone with Country Code and 10-digit validation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Phone Number (For Direct Calling)</span>
                </label>
                <PhoneInput
                  value={phone}
                  onChange={(val) => {
                    setPhone(val);
                    if (sameAsCallingPhone) {
                      setWhatsappPhone(val);
                    }
                  }}
                  countryCode={phoneCountryCode}
                  onCountryCodeChange={(code) => {
                    setPhoneCountryCode(code);
                    if (sameAsCallingPhone) {
                      setWhatsappCountryCode(code);
                    }
                  }}
                  placeholder="9876543210"
                  showDigitCounter={true}
                  disabled={saving}
                />
                <p className="text-[11px] text-slate-400">
                  Customers can tap one button on your storefront to call this line.
                </p>
              </div>

              {/* WhatsApp Chat Number with Same As Calling Phone toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>WhatsApp Chat Number</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-amber-300 hover:text-amber-200">
                    <input
                      type="checkbox"
                      checked={sameAsCallingPhone}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSameAsCallingPhone(checked);
                        if (checked) {
                          setWhatsappPhone(phone);
                          setWhatsappCountryCode(phoneCountryCode);
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Same as Calling Phone</span>
                  </label>
                </div>
                {sameAsCallingPhone ? (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                    <span className="font-mono text-emerald-400">
                      {phoneCountryCode} {phone || "Not set yet"}
                    </span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                      Synced with Calling Phone
                    </Badge>
                  </div>
                ) : (
                  <PhoneInput
                    value={whatsappPhone}
                    onChange={setWhatsappPhone}
                    countryCode={whatsappCountryCode}
                    onCountryCodeChange={setWhatsappCountryCode}
                    placeholder="9876543210"
                    showDigitCounter={true}
                    disabled={saving}
                  />
                )}
                <p className="text-[11px] text-slate-400">
                  Used for instant 1-tap customer chat and queue summon notifications.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-purple-400" />
                  <span>Contact Email</span>
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@rameshbarber.com"
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5 text-pink-400" />
                  <span>Instagram Handle</span>
                </label>
                <Input
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="@rameshbarber"
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              {/* Google Maps Directions URL with Test Link */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    <span>Google Maps Directions URL</span>
                  </label>
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Test Directions Link ↗</span>
                    </a>
                  )}
                </div>
                <Input
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/?q=... or https://goo.gl/maps/..."
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              {/* UPI Payment ID with Client-Side Live NPCI QR Preview */}
              <div className="space-y-2 md:col-span-2 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-amber-400" />
                    <span>Salon UPI Payment ID (VPA)</span>
                  </label>
                  {upiPaymentId && upiPaymentId.includes("@") && (
                    <Badge className="bg-emerald-500/15 border-emerald-500/40 text-emerald-300 text-[10px] w-fit">
                      ✓ Valid NPCI UPI Format
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="sm:col-span-2 space-y-2">
                    <Input
                      value={upiPaymentId}
                      onChange={(e) => setUpiPaymentId(e.target.value.trim().toLowerCase())}
                      placeholder="e.g. rameshsalon@okhdfcbank or 9876543210@upi"
                      className="bg-slate-900 border-slate-700 text-sm font-mono"
                    />
                    <p className="text-[11px] text-slate-400">
                      Used for zero-fee direct customer payments on counter billing &amp; mirror displays.
                    </p>
                  </div>

                  {/* Live UPI QR Preview Canvas */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    {upiPaymentId && upiPaymentId.includes("@") ? (
                      <div className="space-y-1.5 flex flex-col items-center">
                        <div className="p-1.5 bg-white rounded-lg shadow-md">
                          <canvas ref={qrCanvasRef} className="block w-24 h-24 sm:w-28 sm:h-28" />
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          Live Scannable QR
                        </span>
                      </div>
                    ) : (
                      <div className="py-4 text-slate-500 text-center space-y-1">
                        <QrCode className="h-8 w-8 mx-auto opacity-40 text-slate-400" />
                        <p className="text-[10px] text-slate-400">Enter a valid UPI ID (must contain @) to preview QR</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. SALON AMENITIES & FEATURES */}
        <Card className="border border-slate-800 bg-slate-900/60 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-base text-white">Salon Amenities &amp; Reassurances</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Select or add the comfort features available in your salon to showcase on your landing page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {STANDARD_AMENITIES.map((item) => {
                const selected = amenities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAmenity(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      selected
                        ? "bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {selected && <Check className="h-3.5 w-3.5 text-amber-400" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amenities */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <Input
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                placeholder="Add custom amenity (e.g. Free Head Massage with Bleach)"
                className="bg-slate-950 border-slate-800 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomAmenity();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddCustomAmenity}
                variant="outline"
                className="border-slate-700 shrink-0 gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </Button>
            </div>

            {/* Selected Active Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Currently Selected ({amenities.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {amenities.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="border-slate-700 bg-slate-900 text-slate-300 text-xs py-1 px-2.5 flex items-center gap-1.5"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAmenity(item)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      ✕
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

                {/* 6. LOUNGE & QUEUE FEATURE CONTROLS (ADMIN / OWNER / STAFF) */}
        <Card className="border border-slate-800 bg-slate-900/60 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-base text-white">Queue &amp; Lounge Feature Controls</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Control customer-facing digital features on your live queue tracker. Easily enable or disable features based on your salon&apos;s physical setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lounge Wi-Fi Feature Toggle */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Wifi className="h-4 w-4 text-blue-400" />
                    <span>Lounge Guest Wi-Fi Card</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Display your guest Wi-Fi details on the queue page. Turn OFF if your salon has no Wi-Fi or it is down.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableLoungeWifi((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    enableLoungeWifi
                      ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-900 border-slate-800 text-slate-500"
                  }`}
                >
                  {enableLoungeWifi ? "Wi-Fi: ENABLED" : "Wi-Fi: DISABLED"}
                </button>
              </div>

              {enableLoungeWifi && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Wi-Fi Network Name (SSID)</label>
                    <Input
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="e.g. Ramesh_Salon_Guest"
                      className="bg-slate-900 border-slate-800 text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Wi-Fi Password</label>
                    <Input
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder="e.g. Style2026"
                      className="bg-slate-900 border-slate-800 text-xs h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Screen Wake-Lock Feature Toggle */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span>Customer Screen Wake-Lock</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Allows customers in the lounge to keep their phone screen from sleeping while watching their queue timer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnableScreenWakeLock((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  enableScreenWakeLock
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                {enableScreenWakeLock ? "Wake-Lock: ALLOWED" : "Wake-Lock: DISABLED"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Form Footer Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={liveStorefrontUrl}
            target="_blank"
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors inline-flex items-center gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
            <span>Preview Public Storefront</span>
          </Link>

          <Button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-2.5 rounded-xl shadow-xl shadow-amber-500/20 gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Publishing Changes..." : "Save & Publish Storefront"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function OwnerStorefrontPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-500">
          Loading Storefront Configuration...
        </div>
      }
    >
      <OwnerStorefrontContent />
    </Suspense>
  );
}
