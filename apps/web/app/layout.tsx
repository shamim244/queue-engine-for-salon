import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Engine Que System | Enterprise Salon Queue Management",
  description:
    "Real-time high-concurrency queue engine and operational portal for salons, barbershops, and multi-branch studios.",
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
