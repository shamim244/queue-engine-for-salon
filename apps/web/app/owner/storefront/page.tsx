"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Salon } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [upiPaymentId, setUpiPaymentId] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");

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
          setPhone(s.phone || "");
          setWhatsappPhone(s.whatsappPhone || s.phone || "");
          setEmail(s.email || "");
          setInstagramHandle(s.instagramHandle || "");
          setUpiPaymentId(s.upiPaymentId || "");
          setAnnouncement(s.announcement || "");
          setAnnouncementActive(Boolean(s.announcementActive));
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
      const res = await api.salons.update(salon.id, {
        name,
        tagline,
        about,
        operatingHours,
        address,
        googleMapsUrl,
        phone,
        whatsappPhone,
        email,
        instagramHandle,
        upiPaymentId,
        announcement,
        announcementActive,
        amenities,
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
              Provide direct contact and navigation links so customers can call, WhatsApp, or navigate to your salon.
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Phone Number (For Direct Calling)</span>
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">WA</span>
                  <span>WhatsApp Chat Number</span>
                </label>
                <Input
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="bg-slate-950 border-slate-800"
                />
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" />
                  <span>Google Maps Directions URL</span>
                </label>
                <Input
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-amber-400" />
                  <span>UPI Payment ID (For Direct Payments)</span>
                </label>
                <Input
                  value={upiPaymentId}
                  onChange={(e) => setUpiPaymentId(e.target.value)}
                  placeholder="rameshbarber@upi"
                  className="bg-slate-950 border-slate-800"
                />
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
