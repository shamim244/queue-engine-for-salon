import React from "react";
import { Users, Plus, Trash2, Store, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSingleStationPreset,
  getMultiStationPreset,
  type OnboardingFormData,
  type StylistInput,
} from "@/lib/onboarding";

interface StepStylistsRosterProps {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  stepErrors: Record<string, string>;
  addStylist: () => void;
  removeStylist: (index: number) => void;
  updateStylist: (index: number, updates: Partial<StylistInput>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepStylistsRoster({
  formData,
  setFormData,
  stepErrors,
  addStylist,
  removeStylist,
  updateStylist,
  onBack,
  onNext,
}: StepStylistsRosterProps) {
  return (
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
          className="gap-2 border-blue-500/40 text-blue-400 hover:bg-blue-500/10 shrink-0 min-h-[44px]"
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
                      className="bg-slate-900 border-slate-800 text-white h-10 text-xs min-h-[44px]"
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
                      className="bg-slate-900 border-slate-800 text-white h-10 text-xs min-h-[44px]"
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
                      className="bg-slate-900 border-slate-800 text-white h-10 text-xs min-h-[44px]"
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
                      className="bg-slate-900 border-slate-800 text-white font-mono text-center h-10 text-xs min-h-[44px]"
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
                  className="text-slate-500 hover:text-red-400 h-10 px-2 self-end md:self-center min-h-[44px]"
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
              const p = getSingleStationPreset(formData.name, formData.ownerUser.fullName);
              setFormData((prev) => ({ ...prev, stylists: p.stylists }));
            }}
            className="text-xs gap-1.5 min-h-[44px]"
          >
            <Store className="h-3.5 w-3.5" />
            Reset to Single Station (1 Chair)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const p = getMultiStationPreset(formData.name);
              setFormData((prev) => ({ ...prev, stylists: p.stylists }));
            }}
            className="text-xs gap-1.5 min-h-[44px]"
          >
            <Users className="h-3.5 w-3.5" />
            Reset to Multi-Station (2+ Chairs)
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
        <Button variant="outline" onClick={onBack} className="gap-2 min-h-[44px]">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2 bg-blue-600 hover:bg-blue-500 min-h-[44px]">
          Continue to Service Catalog
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
