import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { SlotGrid } from "../components/booking/slot-grid";
import { BookingPassCard } from "../components/booking/booking-pass-card";
import { PayoutSummaryCard } from "../components/payout/payout-summary-card";
import type { Appointment, Salon, AppointmentSlot } from "../lib/api";

describe("Hybrid Appointment Booking & Payout Web Components Suite", () => {
  const mockSalon: Salon = {
    id: "salon-rural-01",
    name: "Ramesh Traditional Barber",
    slug: "ramesh-barber",
    phone: "9876543210",
    currency: "INR",
    countryCode: "+91",
    services: [],
    stylists: [],
  };

  const mockAppointment: Appointment = {
    id: "appt-test-101",
    salonId: "salon-rural-01",
    stylistId: "stylist-1",
    customerName: "Rohan Consumer",
    customerPhone: "9876543210",
    serviceId: "srv-1",
    serviceName: "Haircut + Beard Styling",
    scheduledDate: "2026-11-10",
    slotStartTime: "11:00",
    slotEndTime: "11:40",
    durationMinutes: 40,
    advanceAmount: 100.0,
    totalPrice: 350.0,
    paymentMethod: "RAZORPAY",
    escrowStatus: "HELD",
    status: "CONFIRMED",
  };

  describe("SlotGrid Component", () => {
    it("should render morning, afternoon, and evening period presets with >= 48px touch targets", () => {
      const slots: AppointmentSlot[] = [
        { time: "10:00", available: true },
        { time: "10:30", available: false, reason: "APPOINTMENT_BOOKED" },
        { time: "14:00", available: true },
        { time: "18:00", available: true },
      ];

      const htmlMorning = renderToString(
        <SlotGrid slots={slots} selectedSlot="10:00" onSelectSlot={() => {}} />
      );

      // Period tabs rendered
      expect(htmlMorning).toContain("Morning");
      expect(htmlMorning).toContain("Afternoon");
      expect(htmlMorning).toContain("Evening");

      // Active morning period slots
      expect(htmlMorning).toContain("10:00");
      expect(htmlMorning).toContain("10:30");
      expect(htmlMorning).toContain("min-h-[48px]");
      expect(htmlMorning).toContain("Booked");

      // Test afternoon auto-selection
      const htmlAfternoon = renderToString(
        <SlotGrid slots={slots} selectedSlot="14:00" onSelectSlot={() => {}} />
      );
      expect(htmlAfternoon).toContain("14:00");

      // Test evening auto-selection
      const htmlEvening = renderToString(
        <SlotGrid slots={slots} selectedSlot="18:00" onSelectSlot={() => {}} />
      );
      expect(htmlEvening).toContain("18:00");
    });

    it("should render empty state message when no slots are available", () => {
      const html = renderToString(
        <SlotGrid slots={[]} selectedSlot={null} onSelectSlot={() => {}} />
      );
      expect(html).toContain("No slots available for this date");
    });
  });

  describe("BookingPassCard Component", () => {
    it("should render boarding pass card with customer, service, slot, and escrow details", () => {
      const html = renderToString(
        <BookingPassCard appointment={mockAppointment} salon={mockSalon} />
      );

      expect(html).toContain("VIP Priority Pass");
      expect(html).toContain("Prepaid Escrow");
      expect(html).toContain("Rohan Consumer");
      expect(html).toContain("Haircut + Beard Styling");
      expect(html).toContain("11:00");
      expect(html).toContain("11:40");
      expect(html).toContain("100");
      expect(html).toContain("250"); // Balance Due = 350 - 100
      expect(html).toContain("Confirmed");
    });
  });

  describe("PayoutSummaryCard Component", () => {
    it("should render 97% net bank payout, 2% PG fee, and 1% platform fee", () => {
      const html = renderToString(
        <PayoutSummaryCard
          grossTotal={4000}
          netTotal={3880}
          gatewayTotal={80}
          platformTotal={40}
          payoutVpa="salonpayments@icici"
        />
      );

      expect(html).toContain("3,880.00");
      expect(html).toContain("97.0%");
      expect(html).toContain("4,000.00");
      expect(html).toContain("80.00");
      expect(html).toContain("2.0%");
      expect(html).toContain("40.00");
      expect(html).toContain("1.0%");
      expect(html).toContain("salonpayments@icici");
    });
  });
});
