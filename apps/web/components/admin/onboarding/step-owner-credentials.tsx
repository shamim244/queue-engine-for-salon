import React from "react";
import { ShieldCheck, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OnboardingFormData } from "@/lib/onboarding";

interface StepOwnerCredentialsProps {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  stepErrors: Record<string, string>;
  setStepErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  onBack: () => void;
  onNext: () => void;
}

export function StepOwnerCredentials({
  formData,
  setFormData,
  stepErrors,
  setStepErrors,
  showPassword,
  setShowPassword,
  onBack,
  onNext,
}: StepOwnerCredentialsProps) {
  return (
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
              The salon owner will log in with these credentials at{" "}
              <span className="font-mono text-white">/login</span> to control live queues, override wait times, manage staff shifts, and review daily revenue.
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
              className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
              <span>
                Username <span className="text-red-400">*</span>
              </span>
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
              className={`bg-slate-950 border-slate-800 text-white font-mono text-sm min-h-[44px] ${
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
              <span>
                Password <span className="text-red-400">*</span>
              </span>
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
                className={`bg-slate-950 border-slate-800 text-white pr-10 font-mono text-sm min-h-[44px] ${
                  stepErrors.ownerPassword ? "border-red-500" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
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

          {/* Owner Email */}
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
              className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
        <Button variant="outline" onClick={onBack} className="gap-2 min-h-[44px]">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2 bg-blue-600 hover:bg-blue-500 min-h-[44px]">
          Continue to Stylist Roster
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
