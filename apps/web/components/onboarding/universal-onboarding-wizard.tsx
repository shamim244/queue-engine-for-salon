"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  User,
  CreditCard,
  Rocket,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api, type SubscriptionPlan } from "@/lib/api";
import { slugify, getStandardSalonPreset, submitOnboarding, type OnboardingFormData } from "@/lib/onboarding";
import { partnerApi, getStoredPartner } from "@/lib/partner-api";
import QRCode from "qrcode";

import {
  type UniversalWizardProps,
  type BillingCycle,
  type SlugStatus,
  type UsernameStatus,
  type EmailStatus,
  type QuoteData,
  type LaunchResult,
  FALLBACK_PLANS,
  getCyclePrice,
} from "./types";
import { Step1SalonIdentity } from "./step1-salon-identity";
import { Step2OwnerCredentials } from "./step2-owner-credentials";
import { Step3PlanSelection } from "./step3-plan-selection";
import { Step4SummaryLaunch } from "./step4-summary-launch";
import { StepLaunchSuccess } from "./step-launch-success";

export * from "./types";

export function UniversalSalonOnboardingWizard({
  mode,
  initialPartnerCode = "",
  lockPartnerCode = mode === "PARTNER",
  onSuccessRedirectUrl,
  defaultPlan = "FREE",
  adminOverridesAllowed = mode === "ADMIN",
}: UniversalWizardProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stepper state (1 to 4)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Step 1: Salon Information
  const [salonName, setSalonName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [isSlugManual, setIsSlugManual] = useState<boolean>(false);
  const [salonCountryCode, setSalonCountryCode] = useState<string>("+91");
  const [salonPhone, setSalonPhone] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [category, setCategory] = useState<string>("HAIR_SALON");
  const [upiPaymentId, setUpiPaymentId] = useState<string>("");

  // Step 2: Owner Credentials
  const [ownerFullName, setOwnerFullName] = useState<string>("");
  const [ownerUsername, setOwnerUsername] = useState<string>("");
  const [isUsernameManual, setIsUsernameManual] = useState<boolean>(false);
  const [ownerPassword, setOwnerPassword] = useState<string>("");
  const [ownerCountryCode, setOwnerCountryCode] = useState<string>("+91");
  const [ownerWhatsApp, setOwnerWhatsApp] = useState<string>("");
  const [ownerEmail, setOwnerEmail] = useState<string>("");

  // Step 1 & 2: Real-time Uniqueness Validation States
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({
    isChecking: false,
    available: null,
    suggestions: [],
  });

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({
    isChecking: false,
    available: null,
    suggestions: [],
  });

  const [emailStatus, setEmailStatus] = useState<EmailStatus>({
    isChecking: false,
    available: null,
  });

  // Step 3: Plan & Discount
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>(FALLBACK_PLANS);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("1m");
  const [partnerCode, setPartnerCode] = useState<string>(initialPartnerCode);
  const [isEditingCode, setIsEditingCode] = useState<boolean>(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);

  // Fetch live active plans from the platform API (/api/plans)
  useEffect(() => {
    let isCancelled = false;
    async function loadPlatformPlans() {
      try {
        setIsLoadingPlans(true);
        const res = await api.plans.getAll({ status: "ACTIVE" }).catch(() => null);
        if (!isCancelled && res?.plans && res.plans.length > 0) {
          const activePlans = res.plans.filter((p: SubscriptionPlan) => p.status === "ACTIVE");
          if (activePlans.length > 0) {
            // Sort plans: Free (₹0) first, then by monthly price ascending
            activePlans.sort((a: SubscriptionPlan, b: SubscriptionPlan) => Number(a.price1m) - Number(b.price1m));
            setAvailablePlans(activePlans);

            // Auto-select lowest cost plan (Free ₹0 preferred by default)
            const lowest = activePlans.find((p: SubscriptionPlan) => Number(p.price1m) === 0) || activePlans[0];
            if (defaultPlan && defaultPlan !== "FREE") {
              const matched = activePlans.find(
                (p: SubscriptionPlan) =>
                  p.id === defaultPlan ||
                  p.slug === defaultPlan ||
                  p.name.toUpperCase().includes(defaultPlan.toUpperCase())
              );
              setSelectedPlanId(matched ? matched.id : lowest.id);
            } else {
              setSelectedPlanId(lowest.id);
            }
          }
        }
      } catch (err) {
        console.warn("[OnboardingWizard] Failed to load platform plans, keeping fallback:", err);
      } finally {
        if (!isCancelled) {
          setIsLoadingPlans(false);
        }
      }
    }
    loadPlatformPlans();
    return () => {
      isCancelled = true;
    };
  }, [defaultPlan]);

  // Step 4: Payment selection & Manual UPI
  const [paymentMode, setPaymentMode] = useState<"MANUAL_UPI" | "AUTOMATED_UPI">("MANUAL_UPI");
  const [manualUtr, setManualUtr] = useState<string>("");
  const manualQrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Admin Override
  const [adminFreeTrial, setAdminFreeTrial] = useState<boolean>(false);

  // Selected plan object and tier resolution
  const currentPlan =
    availablePlans.find((p) => p.id === selectedPlanId || p.slug === selectedPlanId) ||
    availablePlans.find((p) => Number(p.price1m) === 0) ||
    availablePlans[0] ||
    FALLBACK_PLANS[0];

  const currentPlanTier: "FREE" | "STARTER" | "PRO" | "ENTERPRISE" =
    Number(currentPlan.price1m) === 0
      ? "FREE"
      : currentPlan.maxBranches > 5 || currentPlan.name.toLowerCase().includes("enterprise")
      ? "ENTERPRISE"
      : currentPlan.maxBranches > 1 || currentPlan.name.toLowerCase().includes("pro")
      ? "PRO"
      : "STARTER";

  const grossPrice = getCyclePrice(currentPlan, selectedCycle);
  const isFreePlan = grossPrice === 0;
  const hasValidDiscount = Boolean(quoteData?.isValid && grossPrice > 0);
  const calculatedDiscount = hasValidDiscount
    ? Number(((grossPrice * (quoteData?.discountPercent || 10)) / 100).toFixed(2))
    : 0;
  const netPayable = adminFreeTrial || isFreePlan ? 0 : Math.max(0, grossPrice - calculatedDiscount);

  // Errors
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Launch Kit Result
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);

  // Reactive sync: update partnerCode whenever initialPartnerCode prop changes
  useEffect(() => {
    if (initialPartnerCode && initialPartnerCode.trim()) {
      setPartnerCode(initialPartnerCode.trim().toUpperCase());
    }
  }, [initialPartnerCode]);

  // Fallback: If in PARTNER mode and partnerCode is empty, auto-populate from local session or profile API
  useEffect(() => {
    if (mode === "PARTNER" && !partnerCode) {
      const stored = getStoredPartner();
      const code = stored?.referralCode || stored?.referral_code;
      if (code) {
        setPartnerCode(String(code).trim().toUpperCase());
      } else {
        partnerApi
          .getMe()
          .then((res) => {
            if (res?.success && res?.partner) {
              const fresh = res.partner.referralCode || res.partner.referral_code;
              if (fresh) {
                setPartnerCode(String(fresh).trim().toUpperCase());
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [mode, partnerCode]);

  // Auto-fill partner code from cookie / search params if in PUBLIC mode
  useEffect(() => {
    if (mode === "PUBLIC" && !partnerCode && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get("ref") || urlParams.get("partner");
      if (codeFromUrl) {
        setPartnerCode(codeFromUrl.trim().toUpperCase());
      } else {
        const match = document.cookie.match(/(?:^|;\s*)partner_ref=([^;]+)/);
        if (match) {
          setPartnerCode(decodeURIComponent(match[1]).trim().toUpperCase());
        }
      }
    }
  }, [mode]);

  // Clipboard paste helper for partner referral code
  const handlePasteCode = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setPartnerCode(text.trim().toUpperCase());
          setIsEditingCode(false);
          return;
        }
      }
    } catch {
      // Browser permission restricted; focus input for manual paste
    }
    const inputEl = document.getElementById("partner-referral-input");
    if (inputEl) inputEl.focus();
  };

  // Sync Slug & Owner Username when salon name changes
  const handleSalonNameChange = (val: string) => {
    setSalonName(val);
    const generatedSlug = slugify(val);
    if (!isSlugManual) {
      setSlug(generatedSlug);
    }
    if (!isUsernameManual) {
      setOwnerUsername(generatedSlug.replace(/-/g, "_"));
    }
  };

  // Live Slug availability checking with 350ms debounce
  useEffect(() => {
    const cleanSlug = (slug || "").trim().toLowerCase();
    if (!cleanSlug || cleanSlug.length < 2) {
      setSlugStatus({ isChecking: false, available: null, suggestions: [] });
      return;
    }

    let isCancelled = false;
    setSlugStatus((prev) => ({ ...prev, isChecking: true }));

    const timer = setTimeout(async () => {
      try {
        const res = await api.salons.checkSlug(cleanSlug);
        if (!isCancelled) {
          setSlugStatus({
            isChecking: false,
            available: res.available,
            reason: res.reason,
            suggestions: res.suggestions || [],
          });
        }
      } catch {
        if (!isCancelled) {
          setSlugStatus({ isChecking: false, available: null, suggestions: [] });
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [slug]);

  // Live Username availability checking with 350ms debounce
  useEffect(() => {
    const cleanUsername = (ownerUsername || "").trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setUsernameStatus({ isChecking: false, available: null, suggestions: [] });
      return;
    }

    let isCancelled = false;
    setUsernameStatus((prev) => ({ ...prev, isChecking: true }));

    const timer = setTimeout(async () => {
      try {
        const res = await api.auth.checkUsername(cleanUsername);
        if (!isCancelled) {
          setUsernameStatus({
            isChecking: false,
            available: res.available,
            reason: res.reason,
            suggestions: res.suggestions || [],
          });
        }
      } catch {
        if (!isCancelled) {
          setUsernameStatus({ isChecking: false, available: null, suggestions: [] });
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [ownerUsername]);

  // Live Email Uniqueness Check (Tier-1 Primary Login Credential)
  useEffect(() => {
    let isCancelled = false;
    const cleanEmail = (ownerEmail || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setEmailStatus({ isChecking: false, available: null, checkedEmail: cleanEmail });
      return;
    }

    setEmailStatus((prev) => ({ ...prev, isChecking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await api.auth.checkEmail(cleanEmail);
        if (!isCancelled) {
          setEmailStatus({
            isChecking: false,
            available: res.available,
            reason: res.reason,
            checkedEmail: cleanEmail,
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          setEmailStatus({
            isChecking: false,
            available: false,
            reason: err?.message || "Failed to check email availability",
            checkedEmail: cleanEmail,
          });
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [ownerEmail]);

  // Live Partner Code verification when code or plan changes
  useEffect(() => {
    let isCancelled = false;
    const activeCode = partnerCode.trim().toUpperCase();

    if (!activeCode) {
      setQuoteData(null);
      return;
    }

    const verify = async () => {
      setIsVerifyingCode(true);
      try {
        const planParam = currentPlan.id || currentPlan.slug || currentPlanTier;
        const res = await partnerApi.verifyCode(activeCode, planParam);
        if (!isCancelled) {
          if (res.isValid || res.valid) {
            setQuoteData({
              isValid: true,
              discountPercent: res.discount?.value || 10,
              discountAmount: res.discount?.discountAmount || 0,
              netPayableAmount: res.discount?.netPayableAmount || 0,
              partnerName: res.partner?.fullName,
              message: res.discount?.message || `${res.discount?.value || 10}% Referral Discount Applied!`,
            });
          } else {
            setQuoteData({
              isValid: false,
              discountPercent: 0,
              discountAmount: 0,
              netPayableAmount: grossPrice,
              message: res.message || "Invalid or inactive referral code",
            });
          }
        }
      } catch {
        if (!isCancelled) {
          setQuoteData({
            isValid: false,
            discountPercent: 0,
            discountAmount: 0,
            netPayableAmount: grossPrice,
            message: "Unable to verify partner code",
          });
        }
      } finally {
        if (!isCancelled) {
          setIsVerifyingCode(false);
        }
      }
    };

    const timer = setTimeout(verify, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [partnerCode, selectedPlanId, selectedCycle, grossPrice, currentPlan.id, currentPlan.slug, currentPlanTier]);

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!salonName.trim() || salonName.trim().length < 2) {
      errors.salonName = "Please enter a valid salon name (at least 2 characters).";
    }
    const cleanPhone = salonPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      errors.salonPhone = "Please provide an exact 10-digit mobile number.";
    }
    if (!slug.trim()) {
      errors.slug = "Salon URL handle is required.";
    } else if (slugStatus.available === false) {
      errors.slug = slugStatus.reason || `Handle '/s/${slug}' is already taken. Please choose another.`;
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0 && slugStatus.available !== false;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!ownerFullName.trim() || ownerFullName.trim().length < 2) {
      errors.ownerFullName = "Please enter the owner full name.";
    }
    if (!ownerUsername.trim() || ownerUsername.trim().length < 3) {
      errors.ownerUsername = "Username must be at least 3 characters.";
    } else if (usernameStatus.available === false) {
      errors.ownerUsername = usernameStatus.reason || `Username '@${ownerUsername}' is already taken. Please choose another.`;
    }
    if (!ownerPassword || ownerPassword.length < 6) {
      errors.ownerPassword = "Password must be at least 6 characters long.";
    }
    if (!ownerEmail.trim()) {
      errors.ownerEmail = "Owner email address is mandatory for primary account login.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(ownerEmail.trim())) {
        errors.ownerEmail = "Please enter a valid email address (e.g. owner@example.com).";
      } else if (emailStatus.checkedEmail === ownerEmail.trim().toLowerCase() && emailStatus.available === false) {
        errors.ownerEmail = emailStatus.reason || "This email address is already registered to another account.";
      }
    }
    if (ownerWhatsApp.trim()) {
      const cleanOwnerPhone = ownerWhatsApp.replace(/\D/g, "");
      if (cleanOwnerPhone.length !== 10) {
        errors.ownerWhatsApp = "Owner WhatsApp must be an exact 10-digit mobile number.";
      }
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0 && usernameStatus.available !== false && emailStatus.available !== false;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    setStepErrors({});
    return Boolean(selectedPlanId || currentPlan);
  };

  const handleNext = () => {
    setApiError(null);
    if (currentStep === 1) {
      if (validateStep1()) {
        // Pre-fill owner whatsapp if empty
        if (!ownerWhatsApp.trim()) {
          setOwnerWhatsApp(salonPhone);
          setOwnerCountryCode(salonCountryCode);
        }
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      if (validateStep3()) {
        setCurrentStep(4);
      }
    }
  };

  const handleBack = () => {
    setApiError(null);
    setStepErrors({});
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Render dynamic UPI QR code on canvas when Step 4 manual payment is active
  useEffect(() => {
    if (currentStep === 4 && !isFreePlan && netPayable > 0 && paymentMode === "MANUAL_UPI") {
      const upiUrl = `upi://pay?pa=engineque@okaxis&pn=EngineQue&am=${netPayable}&cu=INR&tn=Plan-${currentPlanTier}`;
      const timer = setTimeout(() => {
        if (manualQrCanvasRef.current) {
          QRCode.toCanvas(manualQrCanvasRef.current, upiUrl, {
            width: 140,
            margin: 1,
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isFreePlan, netPayable, paymentMode, currentPlanTier]);

  // Submit atomic onboarding
  const handleFinalSubmit = async () => {
    setApiError(null);
    setIsSubmitting(true);

    try {
      const preset = getStandardSalonPreset(salonName, ownerFullName);

      let effectivePartnerCode = partnerCode.trim() ? partnerCode.trim().toUpperCase() : undefined;
      if (!effectivePartnerCode && mode === "PARTNER") {
        const stored = getStoredPartner();
        const code = stored?.referralCode || stored?.referral_code;
        if (code) {
          effectivePartnerCode = String(code).trim().toUpperCase();
        }
      }

      // If user selected a paid plan with manual UPI payment, validate UTR reference
      if (!isFreePlan && netPayable > 0 && paymentMode === "MANUAL_UPI") {
        const cleanUtr = manualUtr.trim();
        if (cleanUtr.length < 6) {
          setStepErrors((prev) => ({
            ...prev,
            manualUtr: "Please enter your 12-digit payment UTR / bank reference number.",
          }));
          setIsSubmitting(false);
          return;
        }
      }

      const isPaidWithManualPayment = !isFreePlan && netPayable > 0 && paymentMode === "MANUAL_UPI";
      // Provision on FREE tier immediately so owner has zero friction, while paid order awaits admin approval
      const initialProvisionTier = isPaidWithManualPayment ? "FREE" : currentPlanTier;

      const formData: OnboardingFormData = {
        name: salonName.trim(),
        slug: slug.trim(),
        phone: `${salonCountryCode}${salonPhone.replace(/\D/g, "")}`,
        address: city.trim() ? city.trim() : undefined,
        currency: "INR",
        countryCode: salonCountryCode,
        upiPaymentId: upiPaymentId.trim() || undefined,
        operatingMode: category,
        organizationName: salonName.trim(),
        tier: initialProvisionTier,
        planId: currentPlan.id,
        billingCycle: selectedCycle,
        partnerCode: effectivePartnerCode,
        ownerUser: {
          fullName: ownerFullName.trim(),
          username: ownerUsername.trim().toLowerCase(),
          password: ownerPassword,
          phone: ownerWhatsApp.trim()
            ? `${ownerCountryCode}${ownerWhatsApp.replace(/\D/g, "")}`
            : `${salonCountryCode}${salonPhone.replace(/\D/g, "")}`,
          email: ownerEmail.trim() || undefined,
        },
        stylists: preset.stylists,
        services: preset.services,
      };

      const result = await submitOnboarding(formData);

      if (result.success && result.salon) {
        const provisioned = result.salon;
        const orgId = result.organization?.id || provisioned.organizationId;
        const origin = typeof window !== "undefined" ? window.location.origin : "https://queue.salon";
        const storeUrl = `${origin}/s/${provisioned.slug}`;
        const queueUrl = `${origin}/s/${provisioned.slug}/queue`;
        const tvUrl = `${origin}/s/${provisioned.slug}/tv`;
        const cleanUser = ownerUsername.trim().toLowerCase();
        const ownerLoginUrl = `${origin}/salon/login?tab=owner&identifier=${encodeURIComponent(cleanUser)}&username=${encodeURIComponent(cleanUser)}`;

        let manualSubmitted: { submitted: boolean; utr?: string; orderId?: string } | null = null;

        if (isPaidWithManualPayment && orgId) {
          try {
            const cleanUtr = manualUtr.trim();
            const orderRes = await api.payments.createOrder({
              targetType: "SUBSCRIPTION",
              targetId: currentPlan.id,
              amount: netPayable,
              provider: "UPI_QR",
              currency: "INR",
              organizationId: orgId,
              salonId: provisioned.id,
              metadata: {
                planId: currentPlan.id,
                planTier: currentPlanTier,
                planName: currentPlan.name,
                basePrice: grossPrice,
                originalAmount: grossPrice,
                friendDiscount: calculatedDiscount,
                discountApplied: calculatedDiscount,
                partnerCode: effectivePartnerCode,
                utrNumber: cleanUtr,
                billingCycle: selectedCycle,
              },
            });

            const createdOrderId = orderRes.order?.orderId || (orderRes.order as any)?.id;
            if (orderRes.success && createdOrderId) {
              await api.payments.submitManual({
                orderId: createdOrderId,
                provider: "UPI_QR",
                utrNumber: cleanUtr,
                notes: `Manual UPI onboarding payment for ${currentPlan.name} (${currentPlanTier}) tier (₹${netPayable}). Reference: ${cleanUtr}`,
              });
              manualSubmitted = {
                submitted: true,
                utr: cleanUtr,
                orderId: createdOrderId,
              };
            }
          } catch (payErr: any) {
            console.warn("Manual payment creation warning:", payErr);
          }
        }

        setLaunchResult({
          salon: provisioned,
          organization: result.organization,
          ownerUser: result.ownerUser,
          storeUrl,
          queueUrl,
          tvUrl,
          ownerLoginUrl,
          manualPayment: manualSubmitted,
          chosenTier: currentPlanTier,
          chosenPlan: currentPlan,
        });

        // Generate QR code onto canvas
        setTimeout(() => {
          if (canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, storeUrl, {
              width: 240,
              margin: 2,
              color: {
                dark: "#0f172a",
                light: "#ffffff",
              },
            });
          }
        }, 100);
      } else {
        setApiError("Failed to provision salon. Please check inputs and try again.");
      }
    } catch (err: any) {
      setApiError(err?.message || "Failed to onboard salon. Please verify all information.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // fallback
    }
  };

  const downloadQrCode = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${slug || "salon"}-door-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const shareOnWhatsApp = () => {
    if (!launchResult) return;
    const message = `Namaste ${ownerFullName || "Salon Owner"}! 💈\n\nYour salon *${launchResult.salon.name}* is now LIVE on Engine Que!\n\n📲 *Customer Queue & Booking Link:*\n${launchResult.storeUrl}\n\n🔐 *Owner Dashboard Login:*\n${launchResult.ownerLoginUrl}\n*Username:* ${ownerUsername}\n\nPrint your Door QR and enjoy zero-irritation client queues!`;
    const url = `https://wa.me/${(ownerWhatsApp || salonPhone).replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handlePostLaunchProceed = () => {
    if (onSuccessRedirectUrl) {
      router.push(onSuccessRedirectUrl);
      return;
    }
    if (mode === "PARTNER") {
      router.push("/partner/salons");
    } else if (mode === "ADMIN") {
      router.push("/admin/tenants");
    } else {
      const cleanUser = ownerUsername.trim().toLowerCase();
      router.push(`/salon/login?tab=owner&identifier=${encodeURIComponent(cleanUser)}&username=${encodeURIComponent(cleanUser)}`);
    }
  };

  // Step 4 post-launch screen
  if (launchResult) {
    return (
      <StepLaunchSuccess
        launchResult={launchResult}
        currentPlan={currentPlan}
        netPayable={netPayable}
        isFreePlan={isFreePlan}
        canvasRef={canvasRef}
        downloadQrCode={downloadQrCode}
        shareOnWhatsApp={shareOnWhatsApp}
        copiedKey={copiedKey}
        copyToClipboard={copyToClipboard}
        ownerUsername={ownerUsername}
        mode={mode}
        handlePostLaunchProceed={handlePostLaunchProceed}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-3 px-3 sm:px-4">
      {/* 4-Step Stepper Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {[
            { step: 1, label: "Salon Info", desc: "Salon Name & Contact Phone", icon: Store },
            { step: 2, label: "Owner Account", desc: "Salon Owner Account Credentials & Password", icon: User },
            { step: 3, label: "Plan & Discount", desc: "Subscription Plan & Discount", icon: CreditCard },
            { step: 4, label: "Summary & Launch", desc: "Launch Your Salon Engine Now", icon: Rocket },
          ].map((item) => {
            const Icon = item.icon;
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;

            return (
              <div
                key={item.step}
                className={`flex-1 flex flex-col items-center relative ${
                  item.step !== 4
                    ? "after:content-[''] after:w-full after:h-[2px] after:absolute after:top-4 after:left-1/2 after:-z-10 " +
                      (isCompleted ? "after:bg-blue-500" : "after:bg-slate-800")
                    : ""
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-blue-600 text-white ring-2 ring-blue-500/30"
                      : isCurrent
                      ? "bg-blue-500/20 text-blue-400 border-2 border-blue-500 shadow-lg shadow-blue-500/20"
                      : "bg-slate-900 border border-slate-800 text-slate-500"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={`text-[11px] sm:text-xs mt-1.5 font-medium text-center truncate max-w-[70px] sm:max-w-none ${
                    isCurrent ? "text-white font-bold" : isCompleted ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
                <span className="sr-only">{item.desc}</span>
              </div>
            );
          })}
        </div>

        {/* Context Mode Pill */}
        <div className="flex items-center justify-between pt-1">
          <Badge
            variant="outline"
            className={`text-[10px] tracking-wide px-2 py-0.5 border ${
              mode === "PARTNER"
                ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                : mode === "ADMIN"
                ? "border-purple-500/40 text-purple-400 bg-purple-950/20"
                : "border-blue-500/40 text-blue-400 bg-blue-950/20"
            }`}
          >
            {mode === "PARTNER"
              ? "🤝 Partner Assisted Onboarding"
              : mode === "ADMIN"
              ? "🛡️ Super Admin Master Provisioning"
              : "⚡ Instant Self-Serve Salon Onboarding"}
          </Badge>
          <span className="text-xs text-slate-400">Step {currentStep} of 4</span>
        </div>
      </div>

      {/* Main Wizard Form Card */}
      <Card className="bg-slate-900/90 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl">
        <CardContent className="p-5 sm:p-7 space-y-6">
          {apiError && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs sm:text-sm flex items-center gap-2">
              <span className="font-bold">Error:</span> {apiError}
            </div>
          )}

          {/* ================= STEP 1: Salon Info ================= */}
          {currentStep === 1 && (
            <Step1SalonIdentity
              salonName={salonName}
              onSalonNameChange={handleSalonNameChange}
              slug={slug}
              setSlug={setSlug}
              isSlugManual={isSlugManual}
              setIsSlugManual={setIsSlugManual}
              salonPhone={salonPhone}
              setSalonPhone={setSalonPhone}
              salonCountryCode={salonCountryCode}
              setSalonCountryCode={setSalonCountryCode}
              city={city}
              setCity={setCity}
              category={category}
              setCategory={setCategory}
              upiPaymentId={upiPaymentId}
              setUpiPaymentId={setUpiPaymentId}
              slugStatus={slugStatus}
              stepErrors={stepErrors}
              setStepErrors={setStepErrors}
            />
          )}

          {/* ================= STEP 2: Owner Credentials ================= */}
          {currentStep === 2 && (
            <Step2OwnerCredentials
              mode={mode}
              ownerFullName={ownerFullName}
              setOwnerFullName={setOwnerFullName}
              ownerUsername={ownerUsername}
              setOwnerUsername={setOwnerUsername}
              isUsernameManual={isUsernameManual}
              setIsUsernameManual={setIsUsernameManual}
              usernameStatus={usernameStatus}
              ownerPassword={ownerPassword}
              setOwnerPassword={setOwnerPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              ownerWhatsApp={ownerWhatsApp}
              setOwnerWhatsApp={setOwnerWhatsApp}
              ownerCountryCode={ownerCountryCode}
              setOwnerCountryCode={setOwnerCountryCode}
              ownerEmail={ownerEmail}
              setOwnerEmail={setOwnerEmail}
              emailStatus={emailStatus}
              stepErrors={stepErrors}
              setStepErrors={setStepErrors}
            />
          )}

          {/* ================= STEP 3: Plan & Partner Discount ================= */}
          {currentStep === 3 && (
            <Step3PlanSelection
              mode={mode}
              availablePlans={availablePlans}
              isLoadingPlans={isLoadingPlans}
              selectedPlanId={selectedPlanId}
              setSelectedPlanId={setSelectedPlanId}
              selectedCycle={selectedCycle}
              setSelectedCycle={setSelectedCycle}
              currentPlan={currentPlan}
              partnerCode={partnerCode}
              setPartnerCode={setPartnerCode}
              lockPartnerCode={lockPartnerCode}
              isEditingCode={isEditingCode}
              setIsEditingCode={setIsEditingCode}
              isVerifyingCode={isVerifyingCode}
              quoteData={quoteData}
              hasValidDiscount={hasValidDiscount}
              grossPrice={grossPrice}
              calculatedDiscount={calculatedDiscount}
              netPayable={netPayable}
              handlePasteCode={handlePasteCode}
              adminOverridesAllowed={adminOverridesAllowed}
              adminFreeTrial={adminFreeTrial}
              setAdminFreeTrial={setAdminFreeTrial}
            />
          )}

          {/* ================= STEP 4: Summary & Launch Kit ================= */}
          {currentStep === 4 && (
            <Step4SummaryLaunch
              salonName={salonName}
              slug={slug}
              ownerUsername={ownerUsername}
              ownerWhatsApp={ownerWhatsApp}
              ownerCountryCode={ownerCountryCode}
              salonPhone={salonPhone}
              salonCountryCode={salonCountryCode}
              currentPlan={currentPlan}
              selectedCycle={selectedCycle}
              grossPrice={grossPrice}
              calculatedDiscount={calculatedDiscount}
              hasValidDiscount={hasValidDiscount}
              quoteData={quoteData}
              partnerCode={partnerCode}
              adminFreeTrial={adminFreeTrial}
              netPayable={netPayable}
              isFreePlan={isFreePlan}
              paymentMode={paymentMode}
              setPaymentMode={setPaymentMode}
              manualUtr={manualUtr}
              setManualUtr={setManualUtr}
              manualQrCanvasRef={manualQrCanvasRef}
              copiedKey={copiedKey}
              copyToClipboard={copyToClipboard}
              stepErrors={stepErrors}
              setStepErrors={setStepErrors}
              availablePlans={availablePlans}
              onSelectPlan={setSelectedPlanId}
            />
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[48px] px-5 text-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold min-h-[48px] px-6 text-sm"
              >
                Continue to Step {currentStep + 1}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || (netPayable > 0 && paymentMode === "MANUAL_UPI" && manualUtr.trim().length < 6)}
                className={`font-bold min-h-[48px] px-8 text-sm shadow-lg ${
                  netPayable === 0
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Provisioning Salon Core...
                  </>
                ) : netPayable === 0 ? (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Launch Your Salon Engine Now (Free) 🚀
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Submit Payment & Launch Salon 🚀
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
