"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ServiceIcon } from "@/components/ui/service-icon";
import {
  SALON_ICON_CATEGORIES,
  searchSalonIcons,
  type SalonIconItem,
} from "@/lib/salon-icons";
import { Search, Sparkles, Check, Link2, ExternalLink } from "lucide-react";

interface IconPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  onSelect: (iconValue: string, iconItem?: SalonIconItem) => void;
}

export function IconPickerDialog({
  isOpen,
  onClose,
  currentValue,
  onSelect,
}: IconPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [customInput, setCustomInput] = useState("");
  const [activeTab, setActiveTab] = useState<"library" | "custom">("library");

  const filteredIcons = useMemo(() => {
    return searchSalonIcons(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const handleSelectIcon = (item: SalonIconItem) => {
    onSelect(item.value, item);
    onClose();
  };

  const handleApplyCustom = () => {
    if (!customInput.trim()) return;
    onSelect(customInput.trim(), {
      id: "custom",
      name: "Custom Service",
      category: "care",
      type: "custom",
      value: customInput.trim(),
      keywords: [],
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} className="max-w-xl">
      <DialogClose onClose={onClose} />
      <div className="w-full">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span>Select Service Icon</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Choose from our pre-filtered salon vector library, SVGRepo vectors, or enter a custom URL.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher: Curated Library vs Custom Icon */}
        <div className="flex border-b border-slate-800 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === "library"
                ? "border-amber-500 text-amber-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            💈 Curated Salon Library ({filteredIcons.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === "custom"
                ? "border-amber-500 text-amber-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🔗 Custom SVG / URL / Emoji
          </button>
        </div>

        {activeTab === "library" ? (
          <div className="space-y-3 my-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search icons (e.g. fade, razor, champy, facial, color)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-xs sm:text-sm min-h-[42px]"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills (Wrapped cleanly without horizontal scrolling) */}
            <div className="flex flex-wrap items-center gap-1.5 py-0.5">
              {SALON_ICON_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                      : "bg-slate-950/80 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Icon Grid with Sleek Dark Custom Scrollbar */}
            <div className="relative border border-slate-800/80 rounded-xl bg-slate-950/40 p-1">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[290px] overflow-y-auto custom-scrollbar p-1.5">
                {filteredIcons.map((item) => {
                  const isSelected = currentValue === item.value;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectIcon(item)}
                      className={`min-h-[72px] p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all relative group active:scale-95 ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/50 shadow-md"
                          : "bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="h-8 w-8 flex items-center justify-center mb-1">
                        <ServiceIcon icon={item.value} size={24} className="text-2xl" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-200 line-clamp-1 group-hover:text-amber-400">
                        {item.name}
                      </span>
                      <span className="text-[9px] uppercase font-mono text-slate-500 tracking-wider">
                        {item.type}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredIcons.length === 0 && (
              <div className="text-center py-6 text-slate-400 space-y-1">
                <p className="text-sm font-semibold">No matching salon icons found</p>
                <p className="text-xs text-slate-500">
                  Try searching for another term, or switch to the &quot;Custom Icon&quot; tab.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Custom Icon / SVG URL Tab */
          <div className="space-y-4 my-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Enter SVGRepo URL, Custom Image CDN, or Unicode Emoji</span>
              </label>
              <Input
                placeholder="e.g. https://www.svgrepo.com/show/475142/hair-clipper.svg or 🧔‍♂️ or lucide:sparkles"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="bg-slate-900 border-slate-700 text-xs sm:text-sm min-h-[44px]"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Tip: You can copy any free vector icon link from{" "}
                <a
                  href="https://www.svgrepo.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 underline inline-flex items-center gap-0.5"
                >
                  SVGRepo.com <ExternalLink className="h-2.5 w-2.5" />
                </a>{" "}
                and paste it directly here.
              </p>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0">
                <ServiceIcon icon={customInput || "✂️"} size={32} className="text-2xl" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">Icon Live Preview</span>
                <span className="text-slate-400 truncate max-w-[280px] block">
                  {customInput.trim() ? customInput : "Default Scissors (✂️)"}
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleApplyCustom}
              disabled={!customInput.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold min-h-[44px]"
            >
              Apply Custom Icon
            </Button>
          </div>
        )}

        <DialogFooter className="border-t border-slate-800/80 pt-3">
          <Button type="button" variant="outline" onClick={onClose} className="min-h-[40px]">
            Cancel
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
