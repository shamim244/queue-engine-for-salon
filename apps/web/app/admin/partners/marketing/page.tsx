"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { adminPartnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Share2,
  Plus,
  Trash2,
  Eye,
  Smartphone,
  Printer,
  HelpCircle,
} from "lucide-react";

export default function AdminPartnerMarketingPage() {
  const [content, setContent] = useState({
    pitchScriptHindi: "",
    pitchScriptEnglish: "",
    whatsappInviteTemplate: "",
    objectionHandling: [] as Array<{ objection: string; response: string }>,
    posterHeadline: "",
    posterSubheadline: "",
    posterBulletPoints: [] as string[],
  });

  const [activeTab, setActiveTab] = useState<"HINDI" | "ENGLISH" | "WHATSAPP" | "OBJECTIONS" | "POSTER">("HINDI");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadMarketing() {
      try {
        const res = await adminPartnerApi.getMarketingContent();
        if (res.success && res.content) {
          setContent({
            pitchScriptHindi: res.content.pitchScriptHindi || "",
            pitchScriptEnglish: res.content.pitchScriptEnglish || "",
            whatsappInviteTemplate: res.content.whatsappInviteTemplate || "",
            objectionHandling: Array.isArray(res.content.objectionHandling) ? res.content.objectionHandling : [],
            posterHeadline: res.content.posterHeadline || "",
            posterSubheadline: res.content.posterSubheadline || "",
            posterBulletPoints: Array.isArray(res.content.posterBulletPoints) ? res.content.posterBulletPoints : [],
          });
        }
      } catch (err: any) {
        console.error("Error loading marketing content:", err);
        setErrorMessage(err?.message || "Failed to load marketing CMS content.");
      } finally {
        setIsLoading(false);
      }
    }
    loadMarketing();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await adminPartnerApi.updateMarketingContent(content);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setErrorMessage(res.message || "Failed to save marketing collateral.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save marketing collateral.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddObjection = () => {
    setContent({
      ...content,
      objectionHandling: [
        ...content.objectionHandling,
        { objection: "New salon owner question / objection", response: "Recommended response for field agents." },
      ],
    });
  };

  const handleRemoveObjection = (index: number) => {
    setContent({
      ...content,
      objectionHandling: content.objectionHandling.filter((_, i) => i !== index),
    });
  };

  const handleUpdateObjection = (index: number, field: "objection" | "response", val: string) => {
    const updated = [...content.objectionHandling];
    updated[index][field] = val;
    setContent({ ...content, objectionHandling: updated });
  };

  const handleAddBullet = () => {
    setContent({
      ...content,
      posterBulletPoints: [...content.posterBulletPoints, "New poster feature highlight"],
    });
  };

  const handleRemoveBullet = (index: number) => {
    setContent({
      ...content,
      posterBulletPoints: content.posterBulletPoints.filter((_, i) => i !== index),
    });
  };

  const handleUpdateBullet = (index: number, val: string) => {
    const updated = [...content.posterBulletPoints];
    updated[index] = val;
    setContent({ ...content, posterBulletPoints: updated });
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div>
        <Link
          href="/admin/partners"
          className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Partner Directory</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs">
                Partner Collateral CMS
              </Badge>
              <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs">
                Field Enablement
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Partner Marketing Kit CMS
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Centrally manage pitch scripts, WhatsApp invite templates, objection handling FAQs, and standee copy displayed to partners at <span className="font-mono text-slate-300">/partner/marketing</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/partner/marketing" target="_blank">
              <Button variant="outline" className="h-10 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>View Partner Page</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Marketing kit updated successfully! All field partners will immediately see the updated scripts and materials.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { id: "HINDI", label: "Hindi Pitch Script", icon: FileText },
          { id: "ENGLISH", label: "English Pitch Script", icon: FileText },
          { id: "WHATSAPP", label: "WhatsApp Template", icon: Smartphone },
          { id: "OBJECTIONS", label: "Objection Handling", icon: HelpCircle },
          { id: "POSTER", label: "Standee & Poster Copy", icon: Printer },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap min-h-[44px] ${
                isSelected
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: Hindi Pitch Script */}
        {activeTab === "HINDI" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span>60-Second In-Shop Pitch Script (Hindi)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                The primary verbal pitch field hustlers use when walking into Indian barber shops and salons.
              </p>
            </div>

            <textarea
              rows={12}
              value={content.pitchScriptHindi}
              onChange={(e) => setContent({ ...content, pitchScriptHindi: e.target.value })}
              className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-amber-500"
              placeholder="Enter Hindi pitch script..."
              required
            />
          </div>
        )}

        {/* Tab 2: English Pitch Script */}
        {activeTab === "ENGLISH" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>Standard Elevator Pitch Script (English)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Corporate and urban pitch for premium unisex salons and spa managers.
              </p>
            </div>

            <textarea
              rows={12}
              value={content.pitchScriptEnglish}
              onChange={(e) => setContent({ ...content, pitchScriptEnglish: e.target.value })}
              className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-amber-500"
              placeholder="Enter English pitch script..."
              required
            />
          </div>
        )}

        {/* Tab 3: WhatsApp Outreach Template */}
        {activeTab === "WHATSAPP" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <span>WhatsApp Outreach & Invite Message</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pre-formatted message partners send to salon owners over WhatsApp. Use <span className="font-mono text-amber-400">{"{{REFERRAL_LINK}}"}</span> for auto-inserting the partner referral URL.
              </p>
            </div>

            <textarea
              rows={8}
              value={content.whatsappInviteTemplate}
              onChange={(e) => setContent({ ...content, whatsappInviteTemplate: e.target.value })}
              className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-amber-500"
              placeholder="Namaste! Digitize your salon..."
              required
            />

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              <span className="font-bold text-slate-200">Dynamic Tokens:</span> <span className="font-mono text-emerald-400">{"{{REFERRAL_LINK}}"}</span> will automatically be replaced with the logged-in partner unique registration link.
            </div>
          </div>
        )}

        {/* Tab 4: Objection Handling FAQs */}
        {activeTab === "OBJECTIONS" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-400" />
                  <span>Objection Handling Cheat Sheets ({content.objectionHandling.length})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Common hesitations salon owners have and recommended counter-arguments for field hustlers.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleAddObjection}
                className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Objection</span>
              </Button>
            </div>

            <div className="space-y-4">
              {content.objectionHandling.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative group">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      Objection #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveObjection(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg"
                      title="Remove Objection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Owner Hesitation / Question</label>
                    <Input
                      type="text"
                      value={item.objection}
                      onChange={(e) => handleUpdateObjection(idx, "objection", e.target.value)}
                      className="h-10 bg-slate-900 border-slate-700 text-white text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Partner Counter-Response</label>
                    <textarea
                      rows={2}
                      value={item.response}
                      onChange={(e) => handleUpdateObjection(idx, "response", e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Standee & Poster Copy */}
        {activeTab === "POSTER" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <span>Printable Standee & Poster Configuration</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Customize the copy shown on the A4 printable tabletop standee generated by partners.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Poster Main Headline
                </label>
                <Input
                  type="text"
                  value={content.posterHeadline}
                  onChange={(e) => setContent({ ...content, posterHeadline: e.target.value })}
                  className="h-11 bg-slate-950 border-slate-700 text-white text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Poster Sub-Headline
                </label>
                <Input
                  type="text"
                  value={content.posterSubheadline}
                  onChange={(e) => setContent({ ...content, posterSubheadline: e.target.value })}
                  className="h-11 bg-slate-950 border-slate-700 text-white text-xs rounded-xl"
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Key Feature Bullet Points</label>
                  <Button
                    type="button"
                    onClick={handleAddBullet}
                    className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Point
                  </Button>
                </div>

                <div className="space-y-2">
                  {content.posterBulletPoints.map((pt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={pt}
                        onChange={(e) => handleUpdateBullet(idx, e.target.value)}
                        className="h-10 bg-slate-950 border-slate-700 text-white text-xs rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBullet(idx)}
                        className="p-2 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/partners">
            <Button type="button" variant="outline" className="h-12 px-6 rounded-xl border-slate-700 text-slate-300 text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSaving}
            className="h-12 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 min-h-[48px]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Marketing Collateral</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
