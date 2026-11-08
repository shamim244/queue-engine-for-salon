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
    it("should render StationChairHeader with active stylist name and pace badge", () => {
      const html = renderToString(
        React.createElement(StationChairHeader, {
          slug: "test-salon",
          activeStylist: mockStylist1,
          hasMultipleStylists: true,
          socketStatus: "connected",
          reconnectAttempts: 0,
          onOpenSwitchChair: () => {},
          onOpenQuickAdd: () => {},
          onLockChair: () => {},
        })
      );

      expect(html).toContain("Vikram Stylist");
      expect(html).toContain("Pace:");
      expect(html).toContain("25");
      expect(html).toContain("Active Station");
      expect(html).toContain("Change Chair");
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
  });
});
