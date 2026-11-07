import React, { useState, useEffect } from "react";
import type { Ticket, Salon } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateUpiUri } from "@/lib/utils";
import QRCode from "qrcode";
import { Smartphone, Banknote, CheckCircle2 } from "lucide-react";

interface StationCheckoutModalProps {
  isOpen: boolean;
  salon: Salon | null;
  currentlyServing: Ticket | null;
  editableBill: number;
  elapsedSeconds: number;
  processingAction: boolean;
  onClose: () => void;
  onBillChange: (val: number) => void;
  onFinishCheckout: (paymentStatus: "CASH_PAID" | "ONLINE_PAID") => void;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function StationCheckoutModal({
  isOpen,
  salon,
  currentlyServing,
  editableBill,
  elapsedSeconds,
  processingAction,
  onClose,
  onBillChange,
  onFinishCheckout,
}: StationCheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CASH">("UPI");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [generatingQr, setGeneratingQr] = useState(false);

  // Generate NPCI Dynamic UPI QR Code client-side
  useEffect(() => {
    if (!isOpen || paymentMethod !== "UPI" || !currentlyServing || !salon) return;
    setGeneratingQr(true);

    const upiId =
      salon.upiPaymentId ||
      (salon.phone ? `${salon.phone.replace(/[^0-9]/g, "")}@upi` : "salon@upi");

    const upiUri = generateUpiUri({
      upiId,
      payeeName: salon.name || "Salon",
      amount: editableBill,
      note: `Ticket #${currentlyServing.ticketNumber} Haircut`,
    });

    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        setQrCodeDataUrl(url);
        setGeneratingQr(false);
      })
      .catch((err) => {
        console.error("Failed to generate UPI QR:", err);
        setGeneratingQr(false);
      });
  }, [isOpen, paymentMethod, editableBill, currentlyServing, salon]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogClose onClose={onClose} />
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl font-black text-white">
          <span>💳 Service Checkout</span>
          {currentlyServing && (
            <Badge variant="warning" className="text-xs">
              Ticket #{currentlyServing.ticketNumber}
            </Badge>
          )}
        </DialogTitle>
        <DialogDescription>
          Confirm final bill amount and payment method to free chair for next client.
        </DialogDescription>
      </DialogHeader>

      {currentlyServing && (
        <div className="space-y-4 my-3">
          {/* Customer & Service Summary */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-white text-sm">{currentlyServing.customerName}</p>
              <p className="text-slate-400 mt-0.5">{currentlyServing.serviceName || "Haircut Service"}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Chair Duration</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Editable Bill Input */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1 uppercase tracking-wider">
              Final Bill Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-lg font-black text-emerald-400">₹</span>
              <Input
                type="number"
                min={0}
                step={10}
                value={editableBill}
                onChange={(e) => onBillChange(Number(e.target.value))}
                className="pl-8 text-xl font-black text-white"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Adjust for custom cuts, beard trims, or add-ons before taking payment.
            </span>
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPaymentMethod("UPI")}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                paymentMethod === "UPI"
                  ? "border-blue-500 bg-blue-500/15 text-white ring-1 ring-blue-500"
                  : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="h-4 w-4 text-blue-400" />
              <span>Online UPI QR</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("CASH")}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                paymentMethod === "CASH"
                  ? "border-emerald-500 bg-emerald-500/15 text-white ring-1 ring-emerald-500"
                  : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
              }`}
            >
              <Banknote className="h-4 w-4 text-emerald-400" />
              <span>Cash Payment</span>
            </button>
          </div>

          {/* TAB 1: DYNAMIC UPI QR CODE */}
          {paymentMethod === "UPI" && (
            <div className="p-4 rounded-2xl bg-white text-slate-950 text-center space-y-3 shadow-xl">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase block">
                  NPCI Dynamic UPI QR
                </span>
                <div className="text-2xl font-black text-slate-950">
                  Scan & Pay ₹{editableBill}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  GPay · PhonePe · Paytm · BHIM
                </p>
              </div>

              <div className="flex justify-center p-2 bg-white rounded-xl">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="UPI Payment QR Code"
                    className="w-48 h-48 object-contain rounded-lg border border-slate-200 shadow-inner"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-lg text-slate-400 text-xs">
                    {generatingQr ? "Generating QR..." : "QR Unavailable"}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-600 font-mono border-t border-slate-200 pt-2">
                <span>Payee: {salon?.name || "Salon"}</span>
                <span className="block text-slate-500 truncate">
                  UPI ID: {salon?.upiPaymentId || (salon?.phone ? `${salon.phone.replace(/[^0-9]/g, "")}@upi` : "salon@upi")}
                </span>
              </div>

              <Button
                size="lg"
                onClick={() => onFinishCheckout("ONLINE_PAID")}
                disabled={processingAction}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm h-12 rounded-xl gap-2 shadow-lg shadow-blue-600/30"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>✅ Payment Received (Confirm & Free Chair)</span>
              </Button>
            </div>
          )}

          {/* TAB 2: CASH PAYMENT */}
          {paymentMethod === "CASH" && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Banknote className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block uppercase font-bold">Cash Collection</span>
                <div className="text-3xl font-black text-white">₹{editableBill}</div>
                <p className="text-xs text-slate-400">Collect physical currency notes from customer.</p>
              </div>

              <Button
                size="lg"
                onClick={() => onFinishCheckout("CASH_PAID")}
                disabled={processingAction}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm h-12 rounded-xl gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Banknote className="h-4 w-4" />
                <span>💵 Confirm ₹{editableBill} Cash Received & Free Chair</span>
              </Button>
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white"
        >
          Back to Active Service
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
