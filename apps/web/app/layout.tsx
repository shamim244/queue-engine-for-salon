import type { Metadata, Viewport } from "next";
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
