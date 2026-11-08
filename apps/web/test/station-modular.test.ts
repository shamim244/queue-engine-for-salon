import { describe, it, expect, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Ticket, Stylist } from "@/lib/api";
import { StationPinLock } from "@/components/station/station-pin-lock";
import { StationChairHeader } from "@/components/station/station-chair-header";
import { StationOpenChairCard } from "@/components/station/station-open-chair-card";
import { StationSummonedCard } from "@/components/station/station-summoned-card";
import { StationWaitingQueue } from "@/components/station/station-waiting-queue";
import { StationNoShowModal } from "@/components/station/station-noshow-modal";
import { StationInServiceCard } from "@/components/station/station-in-service-card";
import { StationAddServicesModal } from "@/components/station/station-add-services-modal";
import { StationCheckoutModal } from "@/components/station/station-checkout-modal";
import { StationEarningsSummary, type StaffDailyReportData } from "@/components/station/station-earnings-summary";
import { StationTransferChairModal } from "@/components/station/station-transfer-chair-modal";
import { triggerHaptic, isHapticSupported } from "@/lib/haptics";

describe("Batch 7: Staff Station Modular Components & Queue Separation", () => {
  const mockStylist1: Stylist = {
    id: "stylist-1",
    salonId: "salon-test",
    name: "Vikram Stylist",
    avgDurationMinutes: 25,
    isAvailable: true,
  };

  const mockStylist2: Stylist = {
    id: "stylist-2",
    salonId: "salon-test",
    name: "Rahul Stylist",
    avgDurationMinutes: 30,
    isAvailable: false,
  };

  const mockTickets: Ticket[] = [
    {
      id: "t-1",
      salonId: "salon-test",
      stylistId: "stylist-1", // Specifically chose Vikram
      ticketNumber: 101,
      customerName: "Aman Sharma",
      status: "WAITING",
      totalPrice: 150,
      createdAt: new Date().toISOString(),
      estimatedWaitMinutes: 5,
    },
    {
      id: "t-2",
      salonId: "salon-test",
      stylistId: "stylist-2", // Specifically chose Rahul
      ticketNumber: 102,
      customerName: "Priya Patel",
      status: "WAITING",
      totalPrice: 200,
      createdAt: new Date().toISOString(),
      estimatedWaitMinutes: 20,
    },
    {
      id: "t-3",
      salonId: "salon-test",
      stylistId: null, // Universal Fast Line - First Available
      ticketNumber: 103,
      customerName: "Sunil Verma",
      status: "WAITING",
      totalPrice: 120,
      createdAt: new Date().toISOString(),
      estimatedWaitMinutes: 15,
    },
  ];

  describe("Queue Partitioning & Separation Logic", () => {
    it("should correctly partition tickets into chair-preferred, universal, and other stylists", () => {
      // Stylist 1 (Vikram) perspective
      const myTickets = mockTickets.filter((t) => t.stylistId === mockStylist1.id);
      const universalTickets = mockTickets.filter((t) => !t.stylistId);
      const otherTickets = mockTickets.filter(
        (t) => t.stylistId && t.stylistId !== mockStylist1.id
      );

      expect(myTickets.length).toBe(1);
      expect(myTickets[0].customerName).toBe("Aman Sharma");

      expect(universalTickets.length).toBe(1);
      expect(universalTickets[0].customerName).toBe("Sunil Verma");

      expect(otherTickets.length).toBe(1);
      expect(otherTickets[0].customerName).toBe("Priya Patel");

      // Eligible count for Stylist 1 = preferred (1) + universal (1) = 2
      const eligibleCount = myTickets.length + universalTickets.length;
      expect(eligibleCount).toBe(2);
    });

    it("should render StationWaitingQueue with tabbed view and client distinctions", () => {
      const html = renderToString(
        React.createElement(StationWaitingQueue, {
          allTickets: mockTickets,
          activeStylist: mockStylist1,
          processingAction: false,
          hasCurrentlyServing: false,
          onSummonSpecific: () => {},
        })
      );

      // Should display tab counters and queue details
      expect(html).toContain("Your Chair");
      expect(html).toContain("Other Chairs");
      expect(html).toContain("Aman Sharma");
      expect(html).toContain("Sunil Verma");
      expect(html).toContain("Requested You");
      expect(html).toContain("First Available");
    });

    it("should strictly order eligible tickets in chronological FIFO order so late preferred arrivals do not jump earlier walk-ins", () => {
      // Replicating user's exact scenario from screenshot:
      // #107 Vivo y200 (checked in at 10:00, First Available)
      // #108 Oppo f27 brave (checked in at 10:05, First Available)
      // #109 OPPO f27 chrome (checked in at 10:10, Requested Vikram)
      const realWorldScenarioTickets: Ticket[] = [
        {
          id: "t-107",
          salonId: "salon-test",
          stylistId: null,
          ticketNumber: 107,
          customerName: "Vivo y200 chrome",
          status: "WAITING",
          totalPrice: 150,
          checkInTime: "2026-11-07T10:00:00.000Z",
          createdAt: "2026-11-07T10:00:00.000Z",
          estimatedWaitMinutes: 3,
        },
        {
          id: "t-108",
          salonId: "salon-test",
          stylistId: null,
          ticketNumber: 108,
          customerName: "Oppo f27 brave",
          status: "WAITING",
          totalPrice: 150,
          checkInTime: "2026-11-07T10:05:00.000Z",
          createdAt: "2026-11-07T10:05:00.000Z",
          estimatedWaitMinutes: 3,
        },
        {
          id: "t-109",
          salonId: "salon-test",
          stylistId: "stylist-1", // Requested Vikram
          ticketNumber: 109,
          customerName: "OPPO f27 chrome",
          status: "WAITING",
          totalPrice: 150,
          checkInTime: "2026-11-07T10:10:00.000Z",
          createdAt: "2026-11-07T10:10:00.000Z",
          estimatedWaitMinutes: 23,
        },
      ];

      const html = renderToString(
        React.createElement(StationWaitingQueue, {
          allTickets: realWorldScenarioTickets,
          activeStylist: mockStylist1,
          processingAction: false,
          hasCurrentlyServing: false,
          onSummonSpecific: () => {},
        })
      );

      // Verify that Vivo y200 chrome appears BEFORE OPPO f27 chrome in rendered HTML
      const pos107 = html.indexOf("Vivo y200 chrome");
      const pos108 = html.indexOf("Oppo f27 brave");
      const pos109 = html.indexOf("OPPO f27 chrome");

      expect(pos107).toBeGreaterThan(-1);
      expect(pos108).toBeGreaterThan(-1);
      expect(pos109).toBeGreaterThan(-1);

      // Strict FIFO order: Vivo y200 (#107) < Oppo f27 brave (#108) < OPPO f27 chrome (#109)
      expect(pos107).toBeLessThan(pos108);
      expect(pos108).toBeLessThan(pos109);
    });
  });

  describe("Station Header & Locked View", () => {
    it("should render streamlined StationChairHeader with active stylist identity and clean status", () => {
      const html = renderToString(
        React.createElement(StationChairHeader, {
          slug: "test-salon",
          activeStylist: mockStylist1,
          hasMultipleStylists: true,
          socketStatus: "connected",
          reconnectAttempts: 0,
          onOpenQuickAdd: () => {},
          onLockChair: () => {},
        })
      );

      expect(html).toContain("Vikram Stylist");
      expect(html).toContain("Live");
      expect(html).not.toContain("Change Chair");
    });

    it("should render StationPinLock with 4-digit numeric pad and active chair title", () => {
      const html = renderToString(
        React.createElement(StationPinLock, {
          salon: { id: "salon-test", name: "Ramesh Salon", slug: "test-salon" } as any,
          activeStylist: mockStylist1,
          enteredPin: "12",
          pinError: "",
          onPinDigit: () => {},
          onClearPin: () => {},
          onBackspace: () => {},
          onOpenSwitchChair: () => {},
        })
      );

      expect(html).toContain("Vikram Stylist&#x27;s Chair");
      expect(html).toContain("Enter 4-Digit Mirror PIN");
      expect(html).toContain("Clear");
      expect(html).toContain("Physical keyboard, numpad &amp; touch supported");
    });
  });

  describe("Chair Operation Work Cards", () => {
    it("should render StationOpenChairCard with eligible ticket count and call action", () => {
      const html = renderToString(
        React.createElement(StationOpenChairCard, {
          eligibleTicketsCount: 2,
          processingAction: false,
          onCallNext: () => {},
        })
      );

      expect(html).toContain("Chair is Open &amp; Available");
      expect(html).toContain("2 eligible clients waiting in queue");
      expect(html).toContain("CALL NEXT CLIENT");
    });

    it("should render StationSummonedCard with customer details and action buttons", () => {
      const summoned = mockTickets[0];
      const html = renderToString(
        React.createElement(StationSummonedCard, {
          summonedTicket: summoned,
          processingAction: false,
          onSeatInChair: () => {},
          onHoldAndCallNext: () => {},
          onReAnnounce: () => {},
        })
      );

      expect(html).toContain("CLIENT CALLED");
      expect(html).toContain("101");
      expect(html).toContain("Aman Sharma");
      expect(html).toContain("In Chair (Customer Arrived)");
      expect(html).toContain("Pause Spot");
      expect(html).toContain("Grace Hold");
      expect(html).toContain("No-Show");
    });

    it("should render StationNoShowModal with confirmation dialog and safety alerts", () => {
      const summoned = mockTickets[0];
      const html = renderToString(
        React.createElement(StationNoShowModal, {
          isOpen: true,
          ticket: summoned,
          processingAction: false,
          onClose: () => {},
          onConfirm: () => {},
        })
      );

      expect(html).toContain("Confirm No-Show Removal");
      expect(html).toContain("Aman Sharma");
      expect(html).toContain("#101");
      expect(html).toContain("permanently remove");
      expect(html).toContain("Keep in Queue");
      expect(html).toContain("Yes, Mark No-Show");
    });

    it("should render StationInServiceCard with + Add-ons action and current bill", () => {
      const inChairTicket: Ticket = {
        ...mockTickets[0],
        status: "IN_CHAIR",
        serviceName: "Haircut",
        totalPrice: 150,
        selectedAddOns: [{ id: "srv-beard", name: "Beard Trim", price: 60, durationMinutes: 15 }],
      };

      const html = renderToString(
        React.createElement(StationInServiceCard, {
          currentlyServing: inChairTicket,
          editableBill: 210,
          processingAction: false,
          onProceedToCheckout: () => {},
          onOpenAddServices: () => {},
        })
      );

      expect(html).toContain("CURRENTLY IN CHAIR");
      expect(html).toContain("+ Add-ons");
      expect(html).toContain("Beard Trim");
      expect(html).toContain("+ Add / Modify");
      expect(html).toContain("Complete Service");
    });

    it("should render StationAddServicesModal with grooming add-on options and live calculation preview", () => {
      const inChairTicket: Ticket = {
        ...mockTickets[0],
        status: "IN_CHAIR",
        serviceName: "Haircut",
        totalPrice: 150,
      };

      const mockSalon = {
        id: "salon-test",
        name: "Test Salon",
        slug: "test-salon",
        services: [
          { id: "srv-1", name: "Haircut", basePrice: 150, estimatedDurationMinutes: 20 },
          { id: "srv-beard", name: "Beard Trim", basePrice: 60, estimatedDurationMinutes: 15 },
          { id: "srv-spa", name: "Hair Spa", basePrice: 200, estimatedDurationMinutes: 30 },
        ],
      } as any;

      const html = renderToString(
        React.createElement(StationAddServicesModal, {
          isOpen: true,
          onClose: () => {},
          salon: mockSalon,
          ticket: inChairTicket,
          isUpdating: false,
          onSave: () => {},
        })
      );

      expect(html).toContain("Add / Modify Services");
      expect(html).toContain("Beard Trim");
      expect(html).toContain("Hair Spa");
      expect(html).toContain("Available Grooming Add-Ons");
      expect(html).toContain("Save Services");
    });

    it("should render StationInServiceCard with Phase 2 client intelligence and 1-tap grooming tags", () => {
      const vipTicket: Ticket = {
        ...mockTickets[0],
        status: "IN_CHAIR",
        customerName: "Vikram Malhotra",
        visitCount: 5,
        lastServiceName: "Fade + Beard Trim",
        groomingTags: ["Sensitive Skin", "Scissor Only"],
        notes: "Prefers cold water rinse",
        totalPrice: 180,
      };

      const html = renderToString(
        React.createElement(StationInServiceCard, {
          currentlyServing: vipTicket,
          editableBill: 180,
          processingAction: false,
          onProceedToCheckout: () => {},
          onToggleGroomingTag: () => {},
          onUpdateNotes: () => {},
        })
      );

      // Check loyalty badge
      expect(html).toContain("5th Visit");
      expect(html).toContain("Regular VIP");
      expect(html).toContain("Fade + Beard Trim");

      // Check grooming tags on compact HUD & dock
      expect(html).toContain("Grooming");
      expect(html).toContain("Sensitive Skin");
      expect(html).toContain("Scissor Only");
    });

    it("should render StationSummonedCard with loyalty badge and preferences on file", () => {
      const summonedTicket: Ticket = {
        ...mockTickets[0],
        status: "SUMMONED",
        customerName: "Rohan Mehra",
        visitCount: 3,
        lastServiceName: "Classic Cut",
        groomingTags: ["Sensitive Skin", "Low Fade"],
        notes: "Gentle neck shave",
      };

      const html = renderToString(
        React.createElement(StationSummonedCard, {
          summonedTicket,
          processingAction: false,
          onSeatInChair: () => {},
          onPauseAndCallNext: () => {},
          onHoldAndCallNext: () => {},
          onNoShow: () => {},
          onReAnnounce: () => {},
        })
      );

      expect(html).toContain("th Visit");
      expect(html).toContain("Regular VIP");
      expect(html).toContain("Client Preferences on File");
      expect(html).toContain("Sensitive Skin");
      expect(html).toContain("Low Fade");
      expect(html).toContain("Gentle neck shave");
    });

    it("should render StationCheckoutModal with wet-hands cash presets, change calculator and tip pills", () => {
      const inChairTicket: Ticket = {
        ...mockTickets[0],
        status: "IN_CHAIR",
        customerName: "Aman Sharma",
        totalPrice: 120,
      };

      const html = renderToString(
        React.createElement(StationCheckoutModal, {
          isOpen: true,
          salon: { id: "salon-1", name: "Ramesh Barber", slug: "ramesh-barber" } as any,
          currentlyServing: inChairTicket,
          editableBill: 120,
          elapsedSeconds: 900,
          processingAction: false,
          onClose: () => {},
          onBillChange: () => {},
          onFinishCheckout: () => {},
        })
      );

      // Check header and billing
      expect(html).toContain("Wet-Hands Fast Checkout");
      expect(html).toContain("101");
      expect(html).toContain("Aman Sharma");
      expect(html).toContain("Barber Tip / Gratuity");
      expect(html).toContain("+ ₹20");
      expect(html).toContain("+ ₹50");

      // Check cash tender presets
      expect(html).toContain("Cash Payment");
      expect(html).toContain("Customer Tendered Currency");
      expect(html).toContain("Exact (₹120)");
      expect(html).toContain("₹200");
      expect(html).toContain("₹500");

      // Check exact cash banner
      expect(html).toContain("Exact cash received");
    });

    it("should render StationChairHeader with Fullscreen and Break toggles", () => {
      const html = renderToString(
        React.createElement(StationChairHeader, {
          slug: "ramesh-barber",
          activeStylist: mockStylist1,
          hasMultipleStylists: true,
          socketStatus: "connected",
          reconnectAttempts: 0,
          isFullscreen: false,
          onToggleBreak: () => {},
          onToggleFullscreen: () => {},
          onOpenQuickAdd: () => {},
          onLockChair: () => {},
        })
      );

      expect(html).toContain("Fullscreen Mode");
      expect(html).toContain("Break");
    });

    it("should render StationChairHeader with daily earnings badge and streamlined status", () => {
      const html = renderToString(
        React.createElement(StationChairHeader, {
          slug: "royal",
          activeStylist: mockStylist1,
          hasMultipleStylists: true,
          socketStatus: "connected",
          reconnectAttempts: 0,
          dailyEarningsTotal: 710,
          dailyClientsCount: 7,
          onOpenEarnings: () => {},
          onOpenQuickAdd: () => {},
          onLockChair: () => {},
        })
      );

      // Verify desktop header toolbar earnings button
      expect(html).toContain("₹710");

      // Verify active stylist title
      expect(html).toContain("Vikram Stylist");
    });

    it("should render StationEarningsSummary with 4 KPI stat cards, service breakdown, completed tickets, and offline status", () => {
      const mockReport: StaffDailyReportData = {
        success: true,
        salonId: "salon-test",
        stylistId: "stylist-1",
        totalServedToday: 7,
        totalRevenueToday: 710,
        avgActualMinutes: 25,
        totalTipsToday: 180,
        manualCashTips: 50,
        servicesCountMap: {
          Massage: 5,
          Shave: 1,
          Haircut: 1,
        },
        completedTickets: [
          {
            id: "tkt-1",
            ticketNumber: 130,
            customerName: "Rahul Sharma",
            serviceName: "Massage",
            totalPrice: 160,
            paymentAmount: 160,
            paymentStatus: "ONLINE_PAID",
            completedTime: new Date().toISOString(),
          },
          {
            id: "tkt-2",
            ticketNumber: 129,
            customerName: "Aman Verma",
            serviceName: "Haircut",
            totalPrice: 100,
            paymentAmount: 120, // ₹20 tip
            paymentStatus: "CASH_PAID",
            completedTime: new Date().toISOString(),
          },
        ],
      };

      const html = renderToString(
        React.createElement(StationEarningsSummary, {
          isOpen: true,
          onClose: () => {},
          activeStylist: mockStylist1,
          salonId: "salon-test",
          slug: "royal",
          report: mockReport,
          isOffline: true,
          onRefresh: () => {},
          onAddCashTip: () => {},
        })
      );

      // Verify header and subtitle
      expect(html).toContain("Barber Daily Shift &amp; Earnings");
      expect(html).toContain("Vikram Stylist");
      expect(html).toContain("Offline Cache");

      // Verify 4 KPI cards
      expect(html).toContain("Clients");
      expect(html).toContain("7");
      expect(html).toContain("Gross Billing");
      expect(html).toContain("710");
      expect(html).toContain("Tips Earned");
      expect(html).toContain("180");
      expect(html).toContain("Pace per client");

      // Verify services breakdown
      expect(html).toContain("Massage");
      expect(html).toContain("clients");
      expect(html).toContain("Shave");
      expect(html).toContain("Haircut");

      // Verify quick cash tip buttons
      expect(html).toContain("Tip");
      expect(html).toContain("Quick Log Cash Tip");
      expect(html).toContain("Custom");

      // Verify completed tickets ledger
      expect(html).toContain("130");
      expect(html).toContain("Rahul Sharma");
      expect(html).toContain("129");
      expect(html).toContain("Aman Verma");
      expect(html).toContain("Cash");
      expect(html).toContain("UPI");
    });

    it("should handle offline station snapshot serialization and client-side restoration without data loss", () => {
      const snapshot = {
        salon: { id: "salon-test", name: "Royal Salon", slug: "royal" },
        tickets: mockTickets,
        activeStylist: mockStylist1,
        currentlyServing: mockTickets[0],
        summonedTicket: null,
        cachedAt: 1731060000000,
      };

      const serialized = JSON.stringify(snapshot);
      expect(serialized).toBeDefined();

      const parsed = JSON.parse(serialized);
      expect(parsed.salon.slug).toBe("royal");
      expect(parsed.tickets.length).toBe(3);
      expect(parsed.activeStylist.name).toBe("Vikram Stylist");
      expect(parsed.currentlyServing.customerName).toBe("Aman Sharma");
    });

    it("should render StationTransferChairModal with target stylist selection and reason pills", () => {
      const html = renderToString(
        React.createElement(StationTransferChairModal, {
          isOpen: true,
          ticket: mockTickets[0],
          stylists: [mockStylist1, mockStylist2],
          currentStylistId: mockStylist1.id,
          onClose: () => {},
          onConfirmTransfer: async () => {},
        })
      );

      expect(html).toContain("1-Tap Chair Handover");
      expect(html).toContain("Rahul Stylist");
      expect(html).toContain("Specialized Service");
      expect(html).toContain("Confirm Chair Transfer");
    });

    it("should safely handle haptic vibrations on server and client environments", () => {
      expect(typeof isHapticSupported).toBe("function");
      // On bun server environment without navigator, should safely return false without throwing
      const res = triggerHaptic("tap");
      expect(res).toBe(false);
    });
  });
});
