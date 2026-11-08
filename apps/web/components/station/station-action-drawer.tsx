import React, { useState } from "react";
import type { Service } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Sparkles, ShieldCheck, FileText, Check, X, Plus } from "lucide-react";

interface StationActionDrawerProps {
  availableAddOns?: Service[];
  selectedAddOns?: Array<{ id: string; name: string; price: number }>;
  addOnIds?: string[];
  groomingTags?: string[];
  notes?: string | null;
  processingAction?: boolean;
  isUpdatingAddon?: boolean;
  onToggleAddOn?: (addonId: string) => void;
  onToggleGroomingTag?: (tag: string) => void;
  onUpdateNotes?: (notes: string) => void;
}

const PRESET_GROOMING_TAGS = [
  { id: "Sensitive Skin", label: "Sensitive Skin", icon: "🛡️" },
  { id: "Low Fade", label: "Low Fade", icon: "🧔" },
  { id: "Scissor Only", label: "Scissor Only", icon: "✂️" },
  { id: "Light Beard Trim", label: "Light Trim", icon: "🪒" },
  { id: "Dry Scalp", label: "Dry Scalp", icon: "🧴" },
  { id: "Zero Machine", label: "Zero Machine", icon: "⚡" },
];

const NOTE_PRESETS = [
  "Cold water wash",
  "Scissor cut only on top",
  "Gentle trimmer on neck",
  "No aftershave / balm only",
  "Square neck taper",
];

export function StationActionDrawer({
  availableAddOns = [],
  selectedAddOns = [],
  addOnIds = [],
  groomingTags = [],
  notes = "",
  processingAction = false,
  isUpdatingAddon = false,
  onToggleAddOn,
  onToggleGroomingTag,
  onUpdateNotes,
}: StationActionDrawerProps) {
  const [activeTab, setActiveTab] = useState<"addons" | "grooming" | "notes" | null>(null);
  const [localNote, setLocalNote] = useState(notes || "");
  const [isNoteDirty, setIsNoteDirty] = useState(false);

  const selectedCount =
    selectedAddOns.length > 0
      ? selectedAddOns.length
      : addOnIds.length;
  const tagsCount = groomingTags.length;
  const hasNote = Boolean(notes && notes.trim());

  const handleToggleTab = (tab: "addons" | "grooming" | "notes") => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  const handleSaveNote = () => {
    setIsNoteDirty(false);
    if (onUpdateNotes && localNote !== notes) {
      onUpdateNotes(localNote);
    }
  };

  const handlePresetNoteClick = (preset: string) => {
    const next = localNote ? `${localNote}, ${preset}` : preset;
    setLocalNote(next);
    setIsNoteDirty(true);
  };

  return (
    <div className="space-y-3">
      {/* 3-Button Tactile Dock (Android Thumb Reach: min 48px height) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Button 1: Add-ons */}
        <button
          type="button"
          onClick={() => handleToggleTab("addons")}
          className={`min-h-[48px] px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none active:scale-95 ${
            activeTab === "addons"
              ? "bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/10"
              : selectedCount > 0
              ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
              : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="truncate">+ Add-ons</span>
          {selectedCount > 0 && (
            <span className="text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded-full">
              +{selectedCount}
            </span>
          )}
        </button>

        {/* Button 2: Grooming Tags */}
        <button
          type="button"
          onClick={() => handleToggleTab("grooming")}
          className={`min-h-[48px] px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none active:scale-95 ${
            activeTab === "grooming"
              ? "bg-sky-500/25 border-sky-400 text-sky-200 ring-2 ring-sky-400/50 shadow-lg shadow-sky-500/10"
              : tagsCount > 0
              ? "bg-sky-950/60 border-sky-500/50 text-sky-300"
              : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-sky-400 shrink-0" />
          <span className="truncate">Grooming</span>
          {tagsCount > 0 && (
            <span className="text-[10px] font-mono font-black bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1.5 py-0.5 rounded-full">
              {tagsCount}
            </span>
          )}
        </button>

        {/* Button 3: Notes */}
        <button
          type="button"
          onClick={() => handleToggleTab("notes")}
          className={`min-h-[48px] px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none active:scale-95 ${
            activeTab === "notes"
              ? "bg-purple-500/25 border-purple-400 text-purple-200 ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/10"
              : hasNote
              ? "bg-purple-950/60 border-purple-500/50 text-purple-300"
              : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4 text-purple-400 shrink-0" />
          <span className="truncate">Notes</span>
          {hasNote && (
            <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
          )}
        </button>
      </div>

      {/* FLOATING ACTION DRAWER PANELS */}
      {activeTab && (
        <div className="p-4 rounded-2xl bg-slate-950/95 border-2 border-slate-700/80 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150 backdrop-blur-md">
          {/* Panel Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              {activeTab === "addons" && (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>1-Tap Add-On Services</span>
                </>
              )}
              {activeTab === "grooming" && (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                  <span>Client Grooming Preferences</span>
                </>
              )}
              {activeTab === "notes" && (
                <>
                  <FileText className="h-3.5 w-3.5 text-purple-400" />
                  <span>Client Special Notes</span>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="h-7 w-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              title="Close Panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* TAB 1: ADD-ONS (1-Tap Checkmark Pills) */}
          {activeTab === "addons" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {availableAddOns.map((addon) => {
                  const isSelected =
                    selectedAddOns.some((a) => a.id === addon.id) ||
                    addOnIds.includes(addon.id);

                  return (
                    <button
                      key={addon.id}
                      type="button"
                      disabled={processingAction || isUpdatingAddon}
                      onClick={() => onToggleAddOn && onToggleAddOn(addon.id)}
                      className={`min-h-[46px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 select-none active:scale-95 ${
                        isSelected
                          ? "bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/60 shadow-md shadow-emerald-500/10"
                          : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                      }`}
                    >
                      <span className="h-5 w-5 rounded-md flex items-center justify-center text-xs font-bold bg-slate-950/60 border border-slate-700">
                        {isSelected ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}
                      </span>
                      <span>{addon.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isSelected ? "bg-emerald-400/20 text-emerald-300" : "bg-slate-950 text-slate-400"}`}>
                        +{formatCurrency(addon.basePrice)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Tap to toggle add-on. Bill updates dynamically in real-time.
              </p>
            </div>
          )}

          {/* TAB 2: GROOMING TAGS (1-Tap Tag Pills) */}
          {activeTab === "grooming" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {PRESET_GROOMING_TAGS.map((tag) => {
                  const safeTags = Array.isArray(groomingTags)
                    ? groomingTags
                    : typeof groomingTags === "string"
                    ? (() => {
                        try {
                          return JSON.parse(groomingTags);
                        } catch {
                          return [];
                        }
                      })()
                    : [];
                  const isTagActive = safeTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      disabled={processingAction}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleGroomingTag && onToggleGroomingTag(tag.id);
                      }}
                      className={`min-h-[46px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 select-none active:scale-95 cursor-pointer ${
                        isTagActive
                          ? "bg-sky-500/25 border-sky-400 text-sky-200 ring-1 ring-sky-400/60 shadow-md shadow-sky-500/10"
                          : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                      }`}
                    >
                      <span className="text-sm">{tag.icon}</span>
                      <span>{tag.label}</span>
                      {isTagActive && <Check className="h-3.5 w-3.5 text-sky-300 ml-1" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Preferences are remembered automatically for customer&apos;s next visit.
              </p>
            </div>
          )}

          {/* TAB 3: NOTES (Quick Presets + Input) */}
          {activeTab === "notes" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {NOTE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetNoteClick(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Custom note (e.g. skin allergy, zero taper)..."
                  value={localNote}
                  onChange={(e) => {
                    setLocalNote(e.target.value);
                    setIsNoteDirty(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveNote();
                  }}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <Button
                  size="sm"
                  type="button"
                  onClick={handleSaveNote}
                  disabled={!isNoteDirty && localNote === notes}
                  className="h-10 px-4 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl gap-1 shrink-0"
                >
                  <Check className="h-4 w-4" />
                  <span>Save</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
