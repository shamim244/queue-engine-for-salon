import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: SITE_CONFIG.meta.defaultTitle,
    template: SITE_CONFIG.meta.titleTemplate,
  },
  description: SITE_CONFIG.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_CONFIG.name,
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: SITE_CONFIG.meta.themeColor,
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
