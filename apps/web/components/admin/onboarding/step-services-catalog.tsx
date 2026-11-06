import React from "react";
import { Scissors, Plus, Trash2, Store, Sparkles, ChevronLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSingleStationPreset,
  getMultiStationPreset,
  type OnboardingFormData,
  type ServiceInput,
} from "@/lib/onboarding";

interface StepServicesCatalogProps {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  stepErrors: Record<string, string>;
  isSubmitting: boolean;
  addService: () => void;
  removeService: (index: number) => void;
  updateService: (index: number, updates: Partial<ServiceInput>) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function StepServicesCatalog({
  formData,
  setFormData,
  stepErrors,
  isSubmitting,
  addService,
  removeService,
  updateService,
  onBack,
  onSubmit,
}: StepServicesCatalogProps) {
  return (
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addService}
          className="gap-2 border-blue-500/40 text-blue-400 hover:bg-blue-500/10 shrink-0 min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {stepErrors.services && (
          <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-800/40">
            {stepErrors.services}
          </p>
        )}

        {/* Template Loaders */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400 font-medium">Quick Template Loaders:</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const p = getSingleStationPreset(formData.name);
                setFormData((prev) => ({ ...prev, services: p.services }));
              }}
              className="text-xs gap-1.5 h-9 min-h-[40px]"
            >
              <Store className="h-3.5 w-3.5" />
              Load Starter Grooming Preset (Haircut, Shave, Beard, Massage)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const p = getMultiStationPreset(formData.name);
                setFormData((prev) => ({ ...prev, services: p.services }));
              }}
              className="text-xs gap-1.5 h-9 min-h-[40px]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Load Multi-Station Preset (Signature Cut, Beard, Spa, Wash)
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
                      className="bg-slate-900 border-slate-800 text-white h-10 text-xs min-h-[44px]"
                    />
                  </div>

                  {/* Price */}
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
                      className="bg-slate-900 border-slate-800 text-white h-10 text-xs font-mono min-h-[44px]"
                    />
                  </div>

                  {/* Duration */}
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
                      className="bg-slate-900 border-slate-800 text-white h-10 text-xs min-h-[44px]"
                    />
                  </div>

                  {/* Add-on Toggle */}
                  <div className="sm:col-span-1 flex flex-col justify-end">
                    <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                      Service Role
                    </label>
                    <label className="h-10 px-3 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer text-xs min-h-[44px]">
                      <span className="text-slate-300">
                        {srv.isAddOn ? "Add-on Upsell" : "Primary Base"}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(srv.isAddOn)}
                        onChange={(e) => updateService(idx, { isAddOn: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0 h-4 w-4"
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
                  className="text-slate-500 hover:text-red-400 h-10 px-2 self-end md:self-center min-h-[44px]"
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
          <div className="text-emerald-400 font-medium">Ready for atomic one-click provisioning</div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
        <Button variant="outline" onClick={onBack} className="gap-2 min-h-[44px]">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 shadow-lg shadow-blue-500/25 min-h-[44px]"
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
  );
}
