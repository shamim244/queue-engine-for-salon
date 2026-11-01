"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  QrCode,
  Tv,
  Armchair,
  ExternalLink,
  Store,
  Scissors,
  Users,
  Copy,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  slugify,
  getRuralSoloPreset,
  getModernMultiPreset,
  validateOnboardingForm,
  submitOnboarding,
  type OnboardingFormData,
  type StylistInput,
  type ServiceInput,
} from "@/lib/onboarding";
import { Salon, Organization } from "@/lib/api";

function OnboardingWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard Step State (1: Identity, 2: Model, 3: Owner, 4: Stylists, 5: Services, 6: Launch Kit)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Provisioning Result (Step 6)
  const [provisionedSalon, setProvisionedSalon] = useState<Salon | null>(null);
  const [provisionedOrg, setProvisionedOrg] = useState<Organization | null>(null);

  // Form State
  const [formData, setFormData] = useState<OnboardingFormData>({
    name: "",
    slug: "",
    phone: "+91 ",
    address: "",
    currency: "INR",
    countryCode: "+91",
    upiPaymentId: "",
    operatingMode: "RURAL_SOLO",
    organizationName: "",
    tier: "SOLO",
    ownerUser: {
      username: "",
      password: "",
      fullName: "",
      phone: "",
      email: "",
    },
    stylists: [
      { name: "Master Barber", phone: "", avgDurationMinutes: 20, pin: "1234" },
    ],
    services: [
      { name: "Haircut", basePrice: 70, estimatedDurationMinutes: 20, isAddOn: false, icon: "✂️" },
      { name: "Shave", basePrice: 50, estimatedDurationMinutes: 15, isAddOn: false, icon: "🪒" },
      { name: "Beard Trim", basePrice: 40, estimatedDurationMinutes: 10, isAddOn: true, icon: "🧔" },
      { name: "Head Massage", basePrice: 60, estimatedDurationMinutes: 15, isAddOn: true, icon: "💆" },
    ],
  });

  // Track if slug has been manually edited by user
  const [isSlugManual, setIsSlugManual] = useState<boolean>(false);

  // Initialize query parameters if available
  useEffect(() => {
    const initialMode = searchParams.get("mode");
    if (initialMode === "MODERN_MULTI" || initialMode === "modern") {
      applyPreset("MODERN_MULTI");
    }
  }, [searchParams]);

  // Sync slug with salon name automatically unless user edited slug manually
  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const updatedSlug = !isSlugManual ? slugify(name) : prev.slug;
      const updatedOwnerUsername = !prev.ownerUser.username || prev.ownerUser.username === slugify(prev.name).replace(/-/g, "_")
        ? slugify(name).replace(/-/g, "_")
        : prev.ownerUser.username;

      return {
        ...prev,
        name,
        slug: updatedSlug,
        ownerUser: {
          ...prev.ownerUser,
          username: updatedOwnerUsername,
        },
      };
    });
    if (stepErrors.name) {
      setStepErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  };

  // Apply Presets
  const applyPreset = (mode: "RURAL_SOLO" | "MODERN_MULTI") => {
    if (mode === "RURAL_SOLO") {
      const preset = getRuralSoloPreset(formData.name, formData.ownerUser.fullName);
      setFormData((prev) => ({
        ...prev,
        operatingMode: "RURAL_SOLO",
        tier: "SOLO",
        stylists: preset.stylists,
        services: preset.services,
      }));
    } else {
      const preset = getModernMultiPreset(formData.name);
      setFormData((prev) => ({
        ...prev,
        operatingMode: "MODERN_MULTI",
        tier: "PRO",
        stylists: preset.stylists,
        services: preset.services,
      }));
    }
  };

  // Step Validation Check before advancing
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) errors.name = "Salon name is required.";
      if (!formData.phone.trim() || formData.phone.trim() === "+91") {
        errors.phone = "Primary contact phone is required.";
      }
    } else if (step === 3) {
      if (!formData.ownerUser.username.trim()) {
        errors.ownerUsername = "Owner username is required.";
      }
      if (!formData.ownerUser.password || formData.ownerUser.password.length < 6) {
        errors.ownerPassword = "Password must be at least 6 characters.";
      }
    } else if (step === 4) {
      if (!formData.stylists || formData.stylists.length === 0) {
        errors.stylists = "At least one stylist must be in the roster.";
      } else {
        const emptyStylist = formData.stylists.some((s) => !s.name.trim());
        if (emptyStylist) {
          errors.stylists = "All stylists must have a valid name.";
        }
      }
    } else if (step === 5) {
      if (!formData.services || formData.services.length === 0) {
        errors.services = "At least one service must be added.";
      } else {
        const emptyService = formData.services.some((s) => !s.name.trim());
        if (emptyService) {
          errors.services = "All services must have a name.";
        }
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setFormError(null);
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setFormError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Stylist Roster Helpers
  const addStylist = () => {
    const index = formData.stylists.length + 1;
    setFormData((prev) => ({
      ...prev,
      stylists: [
        ...prev.stylists,
        {
          name: `Stylist ${index}`,
          phone: "",
          avgDurationMinutes: prev.operatingMode === "RURAL_SOLO" ? 20 : 30,
          pin: `${1000 + index}`,
        },
      ],
    }));
  };

  const updateStylist = (index: number, updates: Partial<StylistInput>) => {
    setFormData((prev) => {
      const nextStylists = [...prev.stylists];
      nextStylists[index] = { ...nextStylists[index], ...updates };
      return { ...prev, stylists: nextStylists };
    });
  };

  const removeStylist = (index: number) => {
    if (formData.stylists.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      stylists: prev.stylists.filter((_, idx) => idx !== index),
    }));
  };

  // Services Catalog Helpers
  const addService = () => {
    setFormData((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          name: "New Service",
          basePrice: 100,
          estimatedDurationMinutes: 20,
          isAddOn: false,
          icon: "✂️",
        },
      ],
    }));
  };

  const updateService = (index: number, updates: Partial<ServiceInput>) => {
    setFormData((prev) => {
      const nextServices = [...prev.services];
      nextServices[index] = { ...nextServices[index], ...updates };
      return { ...prev, services: nextServices };
    });
  };

  const removeService = (index: number) => {
    if (formData.services.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((_, idx) => idx !== index),
    }));
  };

  // Submit Onboarding
  const handleSubmit = async () => {
    setFormError(null);
    const validation = validateOnboardingForm(formData);
    if (!validation.isValid) {
      setStepErrors(validation.errors);
      setFormError("Please fix all validation errors before provisioning.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitOnboarding(formData);
      if (result.success && result.salon) {
        setProvisionedSalon(result.salon);
        setProvisionedOrg(result.organization || null);
        setCurrentStep(6); // Step 6: Confirmation & Instant Launch Kit
      } else {
        setFormError("Provisioning failed. Backend did not return salon profile.");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred during provisioning.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(key);
      setTimeout(() => setCopiedLink(null), 2500);
    }
  };

  // Reset for next tenant
  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      phone: "+91 ",
      address: "",
      currency: "INR",
      countryCode: "+91",
      upiPaymentId: "",
      operatingMode: "RURAL_SOLO",
      organizationName: "",
      tier: "SOLO",
      ownerUser: {
        username: "",
        password: "",
        fullName: "",
        phone: "",
        email: "",
      },
      stylists: [
        { name: "Master Barber", phone: "", avgDurationMinutes: 20, pin: "1234" },
      ],
      services: [
        { name: "Haircut", basePrice: 70, estimatedDurationMinutes: 20, isAddOn: false, icon: "✂️" },
        { name: "Shave", basePrice: 50, estimatedDurationMinutes: 15, isAddOn: false, icon: "🪒" },
        { name: "Beard Trim", basePrice: 40, estimatedDurationMinutes: 10, isAddOn: true, icon: "🧔" },
        { name: "Head Massage", basePrice: 60, estimatedDurationMinutes: 15, isAddOn: true, icon: "💆" },
      ],
    });
    setProvisionedSalon(null);
    setProvisionedOrg(null);
    setCurrentStep(1);
    setIsSlugManual(false);
    setFormError(null);
    setStepErrors({});
  };

  const steps = [
    { id: 1, title: "Identity & Location", desc: "Basic details & slug" },
    { id: 2, title: "Architecture Model", desc: "Rural Solo vs Modern Multi" },
    { id: 3, title: "Owner Account", desc: "Admin credentials" },
    { id: 4, title: "Stylist Roster", desc: "Chairs & Station PINs" },
    { id: 5, title: "Service Catalog", desc: "Prices & Durations" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Guided Tenant Provisioning
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Multi-Step Salon Onboarding Wizard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create an atomic, fully configured salon instance with custom branding, staff roster, services, and ready-to-print QR codes.
          </p>
        </div>

        {currentStep < 6 && (
          <div className="flex items-center gap-3">
            <Link href="/admin/tenants">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Cancel & Exit
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stepper Navigation (Steps 1 to 5) */}
      {currentStep <= 5 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {steps.map((s) => {
              const isPassed = currentStep > s.id;
              const isCurrent = currentStep === s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id < currentStep) setCurrentStep(s.id);
                  }}
                  disabled={s.id > currentStep}
                  className={`text-left p-2.5 rounded-xl transition-all flex flex-col justify-between border ${
                    isCurrent
                      ? "bg-blue-600/10 border-blue-500/50 shadow-sm shadow-blue-500/10"
                      : isPassed
                      ? "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 cursor-pointer"
                      : "bg-slate-900/20 border-slate-800/40 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                        isCurrent
                          ? "bg-blue-600 text-white"
                          : isPassed
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isPassed ? <Check className="h-3 w-3 inline" /> : `0${s.id}`}
                    </span>
                    {isCurrent && (
                      <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold leading-snug truncate ${
                        isCurrent ? "text-blue-300" : isPassed ? "text-slate-200" : "text-slate-500"
                      }`}
                    >
                      {s.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                      {s.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Form Error Alert */}
      {formError && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* STEP 1: Salon Identity & Location */}
      {currentStep === 1 && (
        <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Store className="h-4 w-4" />
              <span>Step 1 of 5</span>
            </div>
            <CardTitle className="text-xl text-white">Salon Identity & Location</CardTitle>
            <CardDescription className="text-slate-400">
              Enter primary business identity, brand handle URL slug, and regional contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Salon Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
                  <span>Salon Name <span className="text-red-400">*</span></span>
                  <span className="text-xs text-slate-500">e.g. Ramesh Traditional Barber</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Royal Crown Barbers"
                  className={`bg-slate-950 border-slate-800 text-white ${
                    stepErrors.name ? "border-red-500" : ""
                  }`}
                />
                {stepErrors.name && (
                  <p className="text-xs text-red-400">{stepErrors.name}</p>
                )}
              </div>

              {/* URL Slug */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
                  <span>Tenant Slug <span className="text-red-400">*</span></span>
                  <span className="text-xs text-slate-500">Auto-generated alphanumeric handle</span>
                </label>
                <div className="relative">
                  <Input
                    value={formData.slug}
                    onChange={(e) => {
                      setIsSlugManual(true);
                      setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }));
                    }}
                    placeholder="royal-crown-barbers"
                    className="bg-slate-950 border-slate-800 text-white font-mono text-sm pl-28"
                  />
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-500 select-none">
                    /s/
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Customer URL: <span className="text-slate-300 font-mono">/s/{formData.slug || "slug"}</span>
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
                  <span>Contact Phone <span className="text-red-400">*</span></span>
                  <span className="text-xs text-slate-500">For SMS & WhatsApp alerts</span>
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, phone: e.target.value }));
                    if (stepErrors.phone) {
                      setStepErrors((errs) => {
                        const n = { ...errs };
                        delete n.phone;
                        return n;
                      });
                    }
                  }}
                  placeholder="+91 98765 43210"
                  className={`bg-slate-950 border-slate-800 text-white ${
                    stepErrors.phone ? "border-red-500" : ""
                  }`}
                />
                {stepErrors.phone && (
                  <p className="text-xs text-red-400">{stepErrors.phone}</p>
                )}
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                </select>
              </div>

              {/* Address */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-200">Address / Location</label>
                <Input
                  value={formData.address || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Shop No. 4, Market Complex, Main Road..."
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              {/* UPI ID (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">UPI Payment ID (Optional)</label>
                <Input
                  value={formData.upiPaymentId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, upiPaymentId: e.target.value }))}
                  placeholder="salon@upi or 9876543210@paytm"
                  className="bg-slate-950 border-slate-800 text-white font-mono text-sm"
                />
                <p className="text-[11px] text-slate-500">
                  Enables instant dynamic UPI QR payment code on completion.
                </p>
              </div>

              {/* Organization Group */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Parent Enterprise Org (Optional)</label>
                <Input
                  value={formData.organizationName || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organizationName: e.target.value }))}
                  placeholder="e.g. Royal Salon Group"
                  className="bg-slate-950 border-slate-800 text-white"
                />
                <p className="text-[11px] text-slate-500">
                  Assigns this branch to a parent franchise or multi-branch organization.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
            <Link href="/admin/tenants">
              <Button variant="ghost" className="text-slate-400">Cancel</Button>
            </Link>
            <Button onClick={handleNext} className="gap-2 bg-blue-600 hover:bg-blue-500">
              Continue to Architecture Model
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: Architecture Model Selection */}
      {currentStep === 2 && (
        <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Armchair className="h-4 w-4" />
              <span>Step 2 of 5</span>
            </div>
            <CardTitle className="text-xl text-white">Select Architecture Model</CardTitle>
            <CardDescription className="text-slate-400">
              Engine Que provides two operational models calibrated for specific physical environments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Rural Solo Barber */}
              <div
                onClick={() => applyPreset("RURAL_SOLO")}
                className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  formData.operatingMode === "RURAL_SOLO"
                    ? "bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10"
                    : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="default" className="text-xs px-2 py-0.5">
                      Solo Barber Model
                    </Badge>
                    {formData.operatingMode === "RURAL_SOLO" && (
                      <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                    <Store className="h-5 w-5 text-amber-400" />
                    Rural Solo Barber
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    Engineered for single-chair community barbers, village setups, and small shops. Minimal setup, zero staff management friction, and 1-tap queue actions.
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Included Capabilities:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        1 Master Stylist
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        Quick Walk-in (+1)
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        WhatsApp / SMS alerts
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        Cash First + UPI QR
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        Low bandwidth (2G/3G)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span>Pre-seeds 4 rural services</span>
                  <span className="font-semibold text-blue-400">Default: Solo Tier</span>
                </div>
              </div>

              {/* Option 2: Modern Multi-Station */}
              <div
                onClick={() => applyPreset("MODERN_MULTI")}
                className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  formData.operatingMode === "MODERN_MULTI"
                    ? "bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-500/10"
                    : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="purple" className="text-xs px-2 py-0.5">
                      Multi-Station Enterprise
                    </Badge>
                    {formData.operatingMode === "MODERN_MULTI" && (
                      <span className="h-5 w-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-400" />
                    Modern Multi-Station Salon
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    Designed for multi-chair salons, luxury parlors, and grooming lounges. Provides per-station PIN access, split queue routing, and TV departure boards.
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Included Capabilities:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        Multi-Stylist Rosters
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        Station 4-Digit PINs
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        Lobby TV Display (/tv)
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        Chair Interface (/station)
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        Split Service Up-sells
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span>Pre-seeds 3 stylists & 4 services</span>
                  <span className="font-semibold text-purple-400">Default: Pro Tier</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} className="gap-2 bg-blue-600 hover:bg-blue-500">
              Continue to Owner Account
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: Owner Account Credentials */}
      {currentStep === 3 && (
        <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" />
              <span>Step 3 of 5</span>
            </div>
            <CardTitle className="text-xl text-white">Owner Account Credentials</CardTitle>
            <CardDescription className="text-slate-400">
              Create the administrative owner credentials to access the dedicated salon owner portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/50 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-200">
                <p className="font-semibold text-white">Autonomous Tenant Ownership</p>
                <p className="mt-0.5 text-blue-300">
                  The salon owner will log in with these credentials at <span className="font-mono text-white">/login</span> to control live queues, override wait times, manage staff shifts, and review daily revenue.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Owner Full Name</label>
                <Input
                  value={formData.ownerUser.fullName || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ownerUser: { ...prev.ownerUser, fullName: e.target.value },
                    }))
                  }
                  placeholder="e.g. Ramesh Kumar"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
                  <span>Username <span className="text-red-400">*</span></span>
                  <span className="text-xs text-slate-500">Unique login handle</span>
                </label>
                <Input
                  value={formData.ownerUser.username}
                  onChange={(e) => {
                    const u = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                    setFormData((prev) => ({
                      ...prev,
                      ownerUser: { ...prev.ownerUser, username: u },
                    }));
                    if (stepErrors.ownerUsername) {
                      setStepErrors((errs) => {
                        const n = { ...errs };
                        delete n.ownerUsername;
                        return n;
                      });
                    }
                  }}
                  placeholder="ramesh_owner"
                  className={`bg-slate-950 border-slate-800 text-white font-mono text-sm ${
                    stepErrors.ownerUsername ? "border-red-500" : ""
                  }`}
                />
                {stepErrors.ownerUsername && (
                  <p className="text-xs text-red-400">{stepErrors.ownerUsername}</p>
                )}
              </div>

              {/* Password with Eye Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
                  <span>Password <span className="text-red-400">*</span></span>
                  <span className="text-xs text-slate-500">Min 6 characters</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.ownerUser.password}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        ownerUser: { ...prev.ownerUser, password: e.target.value },
                      }));
                      if (stepErrors.ownerPassword) {
                        setStepErrors((errs) => {
                          const n = { ...errs };
                          delete n.ownerPassword;
                          return n;
                        });
                      }
                    }}
                    placeholder="Enter secure password"
                    className={`bg-slate-950 border-slate-800 text-white pr-10 font-mono text-sm ${
                      stepErrors.ownerPassword ? "border-red-500" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {stepErrors.ownerPassword ? (
                  <p className="text-xs text-red-400">{stepErrors.ownerPassword}</p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Characters: {formData.ownerUser.password?.length || 0} / 6 minimum
                  </p>
                )}
              </div>

              {/* Owner Email (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Owner Email (Optional)</label>
                <Input
                  type="email"
                  value={formData.ownerUser.email || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ownerUser: { ...prev.ownerUser, email: e.target.value },
                    }))
                  }
                  placeholder="owner@salon.com"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} className="gap-2 bg-blue-600 hover:bg-blue-500">
              Continue to Stylist Roster
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 4: Stylist & Station Roster */}
      {currentStep === 4 && (
        <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                <Users className="h-4 w-4" />
                <span>Step 4 of 5</span>
              </div>
              <CardTitle className="text-xl text-white">Stylist & Station Roster</CardTitle>
              <CardDescription className="text-slate-400">
                Configure barber chairs, staff names, historical durations, and quick 4-digit station PINs.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStylist}
              className="gap-2 border-blue-500/40 text-blue-400 hover:bg-blue-500/10 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add Stylist Chair
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {stepErrors.stylists && (
              <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-800/40">
                {stepErrors.stylists}
              </p>
            )}

            <div className="space-y-3">
              {formData.stylists.map((st, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="h-8 w-8 rounded-lg bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-500/30">
                      #{idx + 1}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
                      {/* Name */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                          Stylist Name *
                        </label>
                        <Input
                          value={st.name}
                          onChange={(e) => updateStylist(idx, { name: e.target.value })}
                          placeholder="Stylist name"
                          className="bg-slate-900 border-slate-800 text-white h-9 text-xs"
                        />
                      </div>

                      {/* Phone */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                          Phone Number
                        </label>
                        <Input
                          value={st.phone || ""}
                          onChange={(e) => updateStylist(idx, { phone: e.target.value })}
                          placeholder="+91..."
                          className="bg-slate-900 border-slate-800 text-white h-9 text-xs"
                        />
                      </div>

                      {/* Avg Duration */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                          Avg Pace (Mins)
                        </label>
                        <Input
                          type="number"
                          value={st.avgDurationMinutes || 25}
                          onChange={(e) =>
                            updateStylist(idx, { avgDurationMinutes: parseInt(e.target.value) || 20 })
                          }
                          min={5}
                          max={180}
                          className="bg-slate-900 border-slate-800 text-white h-9 text-xs"
                        />
                      </div>

                      {/* 4-digit PIN */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                          4-Digit PIN
                        </label>
                        <Input
                          type="text"
                          maxLength={4}
                          value={st.pin || ""}
                          onChange={(e) =>
                            updateStylist(idx, { pin: e.target.value.replace(/\D/g, "").slice(0, 4) })
                          }
                          placeholder="1234"
                          className="bg-slate-900 border-slate-800 text-white font-mono text-center h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {formData.stylists.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStylist(idx)}
                      className="text-slate-500 hover:text-red-400 h-8 px-2 self-end md:self-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = getRuralSoloPreset(formData.name, formData.ownerUser.fullName);
                  setFormData((prev) => ({ ...prev, stylists: p.stylists }));
                }}
                className="text-xs gap-1.5"
              >
                <Store className="h-3.5 w-3.5" />
                Reset to Solo Barber (1 Chair)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = getModernMultiPreset(formData.name);
                  setFormData((prev) => ({ ...prev, stylists: p.stylists }));
                }}
                className="text-xs gap-1.5"
              >
                <Users className="h-3.5 w-3.5" />
                Reset to Multi-Station (3 Chairs)
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} className="gap-2 bg-blue-600 hover:bg-blue-500">
              Continue to Service Catalog
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 5: Service Catalog & Pricing */}
      {currentStep === 5 && (
        <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                <Scissors className="h-4 w-4" />
                <span>Step 5 of 5</span>
              </div>
              <CardTitle className="text-xl text-white">Service Catalog & Pricing</CardTitle>
              <CardDescription className="text-slate-400">
                Define the service catalog, base rate pricing in {formData.currency || "INR"}, durations, and add-on upsells.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addService}
                className="gap-2 border-blue-500/40 text-blue-400 hover:bg-blue-500/10 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {stepErrors.services && (
              <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-800/40">
                {stepErrors.services}
              </p>
            )}

            {/* Catalog Preset Loader Buttons */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-400 font-medium">Quick Template Loaders:</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const p = getRuralSoloPreset(formData.name);
                    setFormData((prev) => ({ ...prev, services: p.services }));
                  }}
                  className="text-xs gap-1.5 h-8"
                >
                  <Store className="h-3.5 w-3.5" />
                  Load Rural Preset (Haircut, Shave, Beard, Massage)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const p = getModernMultiPreset(formData.name);
                    setFormData((prev) => ({ ...prev, services: p.services }));
                  }}
                  className="text-xs gap-1.5 h-8"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Load Modern Multi Preset (Signature Cut, Beard, Spa, Wash)
                </Button>
              </div>
            </div>

            {/* Services List */}
            <div className="space-y-3">
              {formData.services.map((srv, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-500/30">
                      {srv.icon || "✂️"}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
                      {/* Name */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                          Service Title *
                        </label>
                        <Input
                          value={srv.name}
                          onChange={(e) => updateService(idx, { name: e.target.value })}
                          placeholder="e.g. Haircut"
                          className="bg-slate-900 border-slate-800 text-white h-9 text-xs"
                        />
                      </div>

                      {/* Base Price */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                          Price ({formData.currency || "INR"}) *
                        </label>
                        <Input
                          type="number"
                          value={srv.basePrice}
                          onChange={(e) =>
                            updateService(idx, { basePrice: parseFloat(e.target.value) || 0 })
                          }
                          min={0}
                          className="bg-slate-900 border-slate-800 text-white h-9 text-xs font-mono"
                        />
                      </div>

                      {/* Duration Minutes */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                          Est. Duration (Mins)
                        </label>
                        <Input
                          type="number"
                          value={srv.estimatedDurationMinutes}
                          onChange={(e) =>
                            updateService(idx, {
                              estimatedDurationMinutes: parseInt(e.target.value) || 15,
                            })
                          }
                          min={5}
                          max={240}
                          className="bg-slate-900 border-slate-800 text-white h-9 text-xs"
                        />
                      </div>

                      {/* Add-on Toggle */}
                      <div className="sm:col-span-1 flex flex-col justify-end">
                        <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                          Service Role
                        </label>
                        <label className="h-9 px-3 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer text-xs">
                          <span className="text-slate-300">
                            {srv.isAddOn ? "Add-on Upsell" : "Primary Base"}
                          </span>
                          <input
                            type="checkbox"
                            checked={Boolean(srv.isAddOn)}
                            onChange={(e) => updateService(idx, { isAddOn: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {formData.services.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeService(idx)}
                      className="text-slate-500 hover:text-red-400 h-8 px-2 self-end md:self-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Summary Preview Banner */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
              <div>
                <span className="text-slate-200 font-semibold">{formData.name || "Salon"}</span>
                {" • "}
                <span className="text-blue-400 font-mono">/s/{formData.slug || "slug"}</span>
                {" • "}
                <span>{formData.stylists.length} Stylists</span>
                {" • "}
                <span>{formData.services.length} Services</span>
              </div>
              <div className="text-emerald-400 font-medium">
                Ready for atomic one-click provisioning
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 shadow-lg shadow-blue-500/25"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Provisioning Salon Instance...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Provision Salon & Generate Launch Kit 🚀
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 6: Confirmation & Instant Launch Kit */}
      {currentStep === 6 && provisionedSalon && (
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
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2">
                    Launch Owner Hub →
                  </Button>
                </Link>
                <Link href={`/s/${provisionedSalon.slug}/tv`} target="_blank">
                  <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800 gap-2">
                    <Tv className="h-4 w-4" />
                    View Lobby TV
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={resetForm}
                  className="text-slate-400 hover:text-white gap-2"
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
                    <Badge variant="default" className="text-[10px] px-2 py-0">Door Entrance</Badge>
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
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-slate-700">
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
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    {copiedLink === "door" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </CardFooter>
              </Card>

              {/* Card 2: Lobby TV Departure Board */}
              <Card className="bg-slate-900/80 border-slate-800 flex flex-col justify-between hover:border-purple-500/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="purple" className="text-[10px] px-2 py-0">Waiting Lobby</Badge>
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
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-slate-700">
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
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    {copiedLink === "tv" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </CardFooter>
              </Card>

              {/* Card 3: Stylist Mirror / Chair UI */}
              <Card className="bg-slate-900/80 border-slate-800 flex flex-col justify-between hover:border-indigo-500/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="text-[10px] px-2 py-0">Cutting Station</Badge>
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
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-slate-700">
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
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    {copiedLink === "station" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </CardFooter>
              </Card>

              {/* Card 4: Owner Command Hub */}
              <Card className="bg-slate-900/80 border-slate-800 flex flex-col justify-between hover:border-emerald-500/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="success" className="text-[10px] px-2 py-0">Management</Badge>
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
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-slate-700">
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
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    {copiedLink === "owner" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>

          {/* Action Row */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/admin/tenants">
              <Button variant="outline" className="gap-2 border-slate-700 text-slate-300">
                <ChevronLeft className="h-4 w-4" />
                Return to Tenant Directory
              </Button>
            </Link>

            <div className="flex items-center gap-3">
              <Button onClick={resetForm} variant="ghost" className="gap-2 text-slate-300">
                <RotateCcw className="h-4 w-4" />
                Onboard Another Salon
              </Button>
              <Link href={`/owner?salon=${provisionedSalon.slug}`}>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold">
                  Launch Owner Hub →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center text-slate-400">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-sm font-medium">Loading Onboarding Wizard...</span>
          </div>
        </div>
      }
    >
      <OnboardingWizardContent />
    </Suspense>
  );
}
