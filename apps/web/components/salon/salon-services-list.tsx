"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { Service } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ServiceIcon } from "@/components/ui/service-icon";
import { Scissors, ChevronRight, Zap } from "lucide-react";

interface SalonServicesListProps {
  services: Service[];
  slug: string;
  showAllLink?: boolean;
}

export function SalonServicesList({ services, slug, showAllLink = false }: SalonServicesListProps) {
  const [serviceCategory, setServiceCategory] = useState<string>("ALL");

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (serviceCategory === "ALL") return services;
    if (serviceCategory === "ADDONS") return services.filter((s) => s.isAddOn);
    if (serviceCategory === "CORE") return services.filter((s) => !s.isAddOn);
    return services;
  }, [services, serviceCategory]);

  return (
    <section id="services" className="space-y-5 scroll-mt-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Scissors className="h-5 w-5 text-amber-400" />
            <span>Service Menu &amp; Transparent Pricing</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Every service includes consultation, sterile equipment, and precision finishing.
          </p>
        </div>

        {/* Category Filter Pills (Android touch friendly: min height 40px) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All Services" },
            { id: "CORE", label: "Hair & Beard" },
            { id: "ADDONS", label: "Add-Ons & Spa" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setServiceCategory(cat.id)}
              className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                serviceCategory === cat.id
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid (Single column on mobile for easy Android thumb reading) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((srv) => (
          <Card
            key={srv.id}
            className="bg-slate-900/60 border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between hover:shadow-lg group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="h-10 w-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform shrink-0">
                  <ServiceIcon icon={srv.icon} size={24} />
                </div>
                <Badge variant={srv.isAddOn ? "purple" : "secondary"} className="text-[10px]">
                  {srv.isAddOn ? "Add-On" : `${srv.estimatedDurationMinutes} mins`}
                </Badge>
              </div>
              <CardTitle className="text-base text-white mt-2 font-bold group-hover:text-amber-400 transition-colors">
                {srv.name}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Professional salon finish with hot towel clean up and style guidance.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">Price</span>
                  <span className="text-xl font-black text-amber-400">
                    {formatCurrency(srv.basePrice)}
                  </span>
                </div>

                <Link
                  href={`/s/${slug}/queue?service=${srv.id}`}
                  className="min-h-[44px] px-3.5 py-2 text-xs bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-bold gap-1 rounded-xl border border-slate-700 transition-colors flex items-center active:scale-95"
                >
                  <span>Select &amp; Join</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showAllLink && (
        <div className="pt-3 text-center">
          <Link
            href={`/s/${slug}/services`}
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-5 py-2.5 rounded-xl border border-amber-500/30 transition-all"
          >
            <span>View Full Services Catalog</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
