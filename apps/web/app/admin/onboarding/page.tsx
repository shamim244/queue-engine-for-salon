"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, AlertCircle } from "lucide-react";
import {
  slugify,
  validateOnboardingForm,
  submitOnboarding,
  type OnboardingFormData,
  type StylistInput,
  type ServiceInput,
} from "@/lib/onboarding";
import type { Salon, Organization } from "@/lib/api";
import { StepSalonIdentity } from "@/components/admin/onboarding/step-salon-identity";
import { StepSubscriptionPlan } from "@/components/admin/onboarding/step-subscription-plan";
import { StepOwnerCredentials } from "@/components/admin/onboarding/step-owner-credentials";
import { StepStylistsRoster } from "@/components/admin/onboarding/step-stylists-roster";
import { StepServicesCatalog } from "@/components/admin/onboarding/step-services-catalog";
import { StepLaunchKit } from "@/components/admin/onboarding/step-launch-kit";
import { UniversalSalonOnboardingWizard } from "@/components/onboarding/universal-onboarding-wizard";

function OnboardingWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: Universal 4-step wizard vs Granular 5-step configurator
  const [wizardView, setWizardView] = useState<"universal" | "granular">("universal");

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
    organizationName: "",
    tier: "STARTER",
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
    const initialPlan = searchParams.get("plan")?.toUpperCase();
    if (initialPlan === "PRO" || initialPlan === "ENTERPRISE" || initialPlan === "STARTER") {
      setFormData((prev) => ({ ...prev, tier: initialPlan as any }));
    }

    let refCode = searchParams.get("ref") || searchParams.get("partner");
    if (!refCode && typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|;\s*)partner_ref=([^;]+)/);
      if (match) refCode = decodeURIComponent(match[1]);
    }
    if (refCode) {
      setFormData((prev) => ({ ...prev, partnerCode: refCode.trim().toUpperCase() }));
    }
  }, [searchParams]);

  // Sync slug with salon name automatically unless user edited slug manually
  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const updatedSlug = !isSlugManual ? slugify(name) : prev.slug;
      const updatedOwnerUsername =
        !prev.ownerUser.username || prev.ownerUser.username === slugify(prev.name).replace(/-/g, "_")
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

  // Apply Plan Selection
  const applyPlan = (plan: "STARTER" | "PRO" | "ENTERPRISE") => {
    setFormData((prev) => ({
      ...prev,
      tier: plan,
    }));
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
          avgDurationMinutes: 25,
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
        setCurrentStep(6);
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
      organizationName: "",
      tier: "STARTER",
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
    { id: 2, title: "Subscription Plan", desc: "Starter, Pro, or Enterprise" },
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
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white min-h-[44px]">
                Cancel & Exit
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => setWizardView("universal")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            wizardView === "universal"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          ⚡ Universal Fast Wizard (4 Steps)
        </button>
        <button
          type="button"
          onClick={() => setWizardView("granular")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            wizardView === "granular"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          📋 Granular Roster &amp; Catalog Configurator (5 Steps)
        </button>
      </div>

      {/* View 1: Universal Salon Onboarding Wizard (ADMIN mode) */}
      <div className={wizardView === "universal" ? "block" : "hidden"}>
        <UniversalSalonOnboardingWizard
          mode="ADMIN"
          adminOverridesAllowed={true}
          onSuccessRedirectUrl="/admin/tenants"
        />
      </div>

      {/* View 2: Granular 5-Step Configurator */}
      <div className={wizardView === "granular" ? "block space-y-8" : "hidden space-y-8"}>
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
                  className={`text-left p-2.5 rounded-xl transition-all flex flex-col justify-between border min-h-[48px] ${
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
        <StepSalonIdentity
          formData={formData}
          setFormData={setFormData}
          stepErrors={stepErrors}
          setStepErrors={setStepErrors}
          handleNameChange={handleNameChange}
          setIsSlugManual={setIsSlugManual}
          onNext={handleNext}
        />
      )}

      {/* STEP 2: SaaS Subscription Plan Selection */}
      {currentStep === 2 && (
        <StepSubscriptionPlan
          formData={formData}
          applyPlan={applyPlan}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {/* STEP 3: Owner Account Credentials */}
      {currentStep === 3 && (
        <StepOwnerCredentials
          formData={formData}
          setFormData={setFormData}
          stepErrors={stepErrors}
          setStepErrors={setStepErrors}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {/* STEP 4: Stylist & Station Roster */}
      {currentStep === 4 && (
        <StepStylistsRoster
          formData={formData}
          setFormData={setFormData}
          stepErrors={stepErrors}
          addStylist={addStylist}
          removeStylist={removeStylist}
          updateStylist={updateStylist}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {/* STEP 5: Service Catalog & Pricing */}
      {currentStep === 5 && (
        <StepServicesCatalog
          formData={formData}
          setFormData={setFormData}
          stepErrors={stepErrors}
          isSubmitting={isSubmitting}
          addService={addService}
          removeService={removeService}
          updateService={updateService}
          onBack={handleBack}
          onSubmit={handleSubmit}
        />
      )}

      {/* STEP 6: Confirmation & Instant Launch Kit */}
      {currentStep === 6 && provisionedSalon && (
        <StepLaunchKit
          provisionedSalon={provisionedSalon}
          formData={formData}
          copiedLink={copiedLink}
          copyToClipboard={copyToClipboard}
          resetForm={resetForm}
        />
      )}
      </div>
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
