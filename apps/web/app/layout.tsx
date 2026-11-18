import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

export const metadata: Metadata = {
  title: "Engine Que System | Enterprise Salon Queue Management",
  description:
    "Real-time high-concurrency queue engine and operational portal for salons, barbershops, and multi-branch studios.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Engine Que",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV !== "production" && (
          <Script
            id="dev-sw-cleanup"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `if(typeof window!=='undefined'&&'serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(r){for(var s of r){s.unregister();}});if('caches'in window){caches.keys().then(function(k){for(var n of k){caches.delete(n);}});}}`,
            }}
          />
        )}
      </head>
      <body
        className="antialiased min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white"
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
          <ServiceWorkerRegister />
          <PwaInstallBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
