"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import {
  User,
  Scissors,
  Receipt,
  Gift,
  Clock,
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
  CheckCircle2,
  Bookmark,
  Store,
  ChevronRight,
  LogOut,
  QrCode,
} from "lucide-react";

interface VisitHistoryItem {
  id: string;
  salonName: string;
  salonSlug: string;
  date: string;
  service: string;
  stylistName: string;
  amount: number;
  paymentMethod: "CASH" | "UPI";
  invoiceNumber: string;
}

export default function CustomerAccountPage() {
  const { user, logout, demoLogin } = useAuth();

  // Grooming Profile State
  const [preferredStylist, setPreferredStylist] = useState("Ramesh Master Barber");
  const [haircutSpecs, setHaircutSpecs] = useState(
    "Zero fade on sides, scissor texture on top, beard lined up with straight razor."
  );
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [specsSaved, setSpecsSaved] = useState(false);

  // Digital Receipt Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<VisitHistoryItem | null>(null);

  // Simulated Visit History
  const [visits] = useState<VisitHistoryItem[]>([
    {
      id: "inv-2026-001",
      salonName: "Royal Crown Barbers",
      salonSlug: "salon-rural-01",
      date: "28 Oct 2026",
      service: "Royal Haircut & Beard Shaping",
      stylistName: "Ramesh",
      amount: 220,
      paymentMethod: "UPI",
      invoiceNumber: "EQ-RC-8491",
    },
    {
      id: "inv-2026-002",
      salonName: "Royal Crown Barbers",
      salonSlug: "salon-rural-01",
      date: "12 Oct 2026",
      service: "Standard Haircut",
      stylistName: "Ramesh",
      amount: 150,
      paymentMethod: "CASH",
      invoiceNumber: "EQ-RC-7812",
    },
    {
      id: "inv-2026-003",
      salonName: "Style Studio Lounge",
      salonSlug: "urban-lounge-01",
      date: "25 Sep 2026",
      service: "Hair Wash + Fade Cut",
      stylistName: "Leo",
      amount: 300,
      paymentMethod: "UPI",
      invoiceNumber: "EQ-SS-6240",
    },
  ]);

  // Loyalty Stamp Card
  const currentStamps = 4;
  const totalStampsNeeded = 6;

  const handleSaveSpecs = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingSpecs(false);
    setSpecsSaved(true);
    setTimeout(() => setSpecsSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              <User className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base text-white leading-none block">
                Customer Grooming Hub
              </span>
              <span className="text-[11px] text-slate-400">
                {user ? user.username : "Guest Account"} · Digital Receipts & Loyalty
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/s/salon-rural-01">
              <Button size="sm" className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5">
                <Scissors className="h-3.5 w-3.5" />
                <span>Join Live Queue</span>
              </Button>
            </Link>

            {user ? (
              <Button variant="ghost" size="sm" onClick={() => logout()} className="text-xs text-rose-400">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => demoLogin("CUSTOMER")}
                className="text-xs border-dashed gap-1"
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                Demo User
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Welcome & Fast Re-Queue Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/30 via-slate-900 to-amber-950/20 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <Badge variant="purple" className="text-xs px-2.5 py-0.5">
              FREQUENT GROOMER
            </Badge>
            <h1 className="text-2xl font-black text-white">
              Welcome back, {user?.username || "Vikram Sharma"}
            </h1>
            <p className="text-xs text-slate-400">
              Your saved fade specs & digital receipts are safely stored in your cloud profile.
            </p>
          </div>

          <Link href="/s/salon-rural-01">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm gap-2 rounded-xl shadow-lg shadow-amber-500/20">
              <Sparkles className="h-4 w-4" />
              <span>1-Tap Re-Queue for My Cut</span>
            </Button>
          </Link>
        </div>

        {/* 2-Col Grid: Grooming Specs + Loyalty Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Saved Haircut Specs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-amber-400" />
                  <span>My Grooming Specs & Barber Notes</span>
                </CardTitle>
                <CardDescription>
                  Show this to your barber or let them scan your profile.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingSpecs(!isEditingSpecs)}
                className="text-xs h-8"
              >
                {isEditingSpecs ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {isEditingSpecs ? (
                <form onSubmit={handleSaveSpecs} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Preferred Stylist
                    </label>
                    <Input
                      value={preferredStylist}
                      onChange={(e) => setPreferredStylist(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Haircut & Beard Specifications
                    </label>
                    <textarea
                      rows={3}
                      value={haircutSpecs}
                      onChange={(e) => setHaircutSpecs(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <Button type="submit" size="sm" className="bg-amber-500 text-slate-950 font-bold text-xs">
                    Save Specifications
                  </Button>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Preferred Barber:</span>
                    <strong className="text-white">{preferredStylist}</strong>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60">
                    <span className="text-[11px] text-slate-400 block mb-1">Haircut Style Notes:</span>
                    <p className="text-xs text-slate-200 italic font-mono bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      &quot;{haircutSpecs}&quot;
                    </p>
                  </div>
                </div>
              )}

              {specsSaved && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Grooming specifications saved to your profile!</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Digital Loyalty Stamp Card */}
          <Card className="border-amber-500/30 bg-gradient-to-br from-slate-900 to-amber-950/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-400" />
                  <span>Loyalty Stamp Card</span>
                </span>
                <Badge variant="warning" className="text-xs font-bold">
                  {currentStamps} of {totalStampsNeeded} Cuts
                </Badge>
              </CardTitle>
              <CardDescription>
                Earn 1 digital stamp per salon checkout. Complete 6 for a free beard styling!
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* 6 Stamp Circles Grid */}
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const isCompleted = num <= currentStamps;
                  const isReward = num === 6;

                  return (
                    <div
                      key={num}
                      className={`h-14 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                        isCompleted
                          ? "border-amber-400 bg-amber-500/20 text-amber-300 font-black shadow-md shadow-amber-500/10"
                          : isReward
                          ? "border-dashed border-amber-500/60 bg-amber-500/5 text-amber-400"
                          : "border-slate-800 bg-slate-900/60 text-slate-600"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-amber-400" />
                      ) : isReward ? (
                        <Gift className="h-6 w-6 text-amber-400/80" />
                      ) : (
                        <span className="text-sm font-bold font-mono">{num}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-300 text-center font-medium">
                🎁 <strong>2 more visits</strong> to unlock your Free Beard Styling reward!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Visit History & Digital Tax Invoices Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-400" />
                <span>Visit History & Digital Tax Invoices</span>
              </CardTitle>
              <CardDescription>
                Review previous appointments, barbers, and download verified digital receipts.
              </CardDescription>
            </div>
            <Badge variant="default">{visits.length} Completed</Badge>
          </CardHeader>

          <CardContent>
            <div className="divide-y divide-slate-800">
              {visits.map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-800/30 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{item.service}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-white font-medium">{item.salonName}</span>
                        <span>•</span>
                        <span>Barber: {item.stylistName}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-400">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">
                        {item.paymentMethod} PAID
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInvoice(item)}
                      className="text-xs h-8 border-slate-700 hover:border-blue-400 text-slate-300 gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-400" />
                      <span>Invoice</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Digital Tax Invoice Modal */}
      <Dialog open={Boolean(selectedInvoice)} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogClose onClose={() => setSelectedInvoice(null)} />
        {selectedInvoice && (
          <div className="space-y-6 p-2">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Tax Invoice Receipt</span>
                <Badge variant="success">PAID</Badge>
              </DialogTitle>
              <DialogDescription>
                Official digital receipt for tax and personal records.
              </DialogDescription>
            </DialogHeader>

            {/* Receipt Paper Card */}
            <div className="p-6 rounded-2xl bg-white text-slate-950 font-mono text-xs space-y-4 shadow-inner border border-slate-200">
              <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
                <p className="font-black text-base uppercase">{selectedInvoice.salonName}</p>
                <p className="text-[10px] text-slate-600">GSTIN: 07AAAAA0000A1Z5</p>
                <p className="text-[10px] text-slate-600">Invoice: #{selectedInvoice.invoiceNumber}</p>
                <p className="text-[10px] text-slate-600">Date: {selectedInvoice.date}</p>
              </div>

              <div className="space-y-2 py-2">
                <div className="flex justify-between font-bold">
                  <span>{selectedInvoice.service}</span>
                  <span>{formatCurrency(selectedInvoice.amount)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Barber / Stylist:</span>
                  <span>{selectedInvoice.stylistName}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Payment Mode:</span>
                  <span>{selectedInvoice.paymentMethod}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-slate-300 flex justify-between font-black text-sm">
                <span>TOTAL PAID:</span>
                <span>{formatCurrency(selectedInvoice.amount)}</span>
              </div>

              <p className="text-center text-[10px] text-slate-500 pt-2">
                Thank you for visiting {selectedInvoice.salonName}!
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Print / Save PDF
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
