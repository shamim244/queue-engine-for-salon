"use client";

import dynamic from "next/dynamic";
import React, { use } from "react";

// Zero Server Waste & Zero Hydration Risk:
// The Lounge TV is an interactive, real-time mirror display powered by WebSockets,
// client-side Web Audio API synthesis, and in-memory timers. Disabling SSR completely
// eliminates any hydration mismatch between server time/Turbopack cache and the client.
const TvClient = dynamic(() => import("./tv-client"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 select-none">
      <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">
        Connecting Live Lounge TV...
      </span>
    </div>
  ),
});

export default function SalonLobbyTvPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <TvClient slug={slug} />;
}
