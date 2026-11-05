"use client";

import React from "react";
import { Star, ShieldCheck } from "lucide-react";

interface Review {
  id: string;
  name: string;
  rating: number;
  date: string;
  comment: string;
  tag: string;
}

const DEFAULT_REVIEWS: Review[] = [
  {
    id: "rev-1",
    name: "Vikram Sharma",
    rating: 5,
    date: "2 days ago",
    comment:
      "Game changer! I checked the live queue from my shop, walked in when 1 person was ahead, and sat down immediately without wasting 45 minutes in a crowded lobby.",
    tag: "Regular Client",
  },
  {
    id: "rev-2",
    name: "Amit Patel",
    rating: 5,
    date: "1 week ago",
    comment:
      "Ramesh bhai gives the best fade and beard shape in the area. Ultra clean salon with sterile blade changes and warm hospitality.",
    tag: "Verified Walk-in",
  },
  {
    id: "rev-3",
    name: "Sandeep Verma",
    rating: 5,
    date: "3 weeks ago",
    comment:
      "The UPI QR code payment and live progress timer on my phone made checkout effortless. Highly recommended!",
    tag: "Online Ticket",
  },
];

interface SalonReviewsProps {
  reviews?: Review[];
}

export function SalonReviews({ reviews = DEFAULT_REVIEWS }: SalonReviewsProps) {
  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            <span>Customer Stories &amp; Reviews</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real feedback from verified neighbourhood clients.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          <ShieldCheck className="h-4 w-4" />
          <span>4.9 / 5.0 (240+ cuts)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] text-slate-500">{rev.date}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="font-bold text-white">{rev.name}</span>
              <span className="text-[10px] text-amber-400/90 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {rev.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
