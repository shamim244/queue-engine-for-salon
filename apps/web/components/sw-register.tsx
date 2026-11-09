"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // In development mode, NEVER register service worker, and proactively unregister
    // any existing workers and purge caches to prevent stale chunk / module factory errors.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().then((unregistered) => {
            if (unregistered) {
              console.log("[PWA] Cleaned up dev service worker:", reg.scope);
            }
          });
        }
      });
      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
      return;
    }

    // Register service worker after window load to avoid competing for bandwidth during critical hydration
    const handleLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[PWA] Service Worker registered with scope:", registration.scope);

          // Check for background updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[PWA] New version ready for seamless background activation.");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn("[PWA] Service Worker registration skipped or failed:", error);
        });
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  return null;
}
