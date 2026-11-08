"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already dismissed recently
    try {
      const dismissedAt = localStorage.getItem("eq_pwa_dismissed_at");
      if (dismissedAt) {
        const timeDiff = Date.now() - parseInt(dismissedAt, 10);
        // Suppress for 7 days if user previously dismissed
        if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
          return;
        }
      }
    } catch {}

    // Check if app is already running in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt banner after brief delay so user interacts with page first
      setTimeout(() => setVisible(true), 2500);
    };

    const handleAppInstalled = () => {
      console.log("[PWA] Engine Que successfully installed on home screen!");
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        console.log("[PWA] User accepted the install prompt");
        setVisible(false);
      } else {
        console.log("[PWA] User dismissed the install prompt");
      }
    } catch (err) {
      console.warn("[PWA] Error during install trigger:", err);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem("eq_pwa_dismissed_at", Date.now().toString());
    } catch {}
  };

  if (!visible || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-blue-500/30 shadow-2xl shadow-blue-950/60 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/30 shrink-0">
              EQ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm tracking-tight text-white">Install Engine Que</h4>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Android App
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                Add to home screen for instant 1-tap queue check-ins and offline ticket tracking.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-slate-800/80">
          <Button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-2 rounded-xl shadow-md shadow-blue-600/25 active:scale-[0.98] transition-all"
          >
            <Download className="h-4 w-4" />
            <span>{isInstalling ? "Installing..." : "Install App to Phone"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleDismiss}
            className="h-11 px-3.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl"
          >
            Not Now
          </Button>
        </div>
      </div>
    </div>
  );
}
