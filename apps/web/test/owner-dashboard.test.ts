import { describe, it, expect, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock next/navigation
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mock((_url: string) => {}),
    replace: mock((_url: string) => {}),
    prefetch: mock(() => {}),
    back: mock(() => {}),
  }),
  usePathname: () => "/owner",
  useSearchParams: () => new URLSearchParams("salon=ramesh-barber"),
}));

import {
  OwnerKpiSummary,
  ChairsFloorGrid,
  ActiveQueueTable,
  OperationalSurfacesCard,
  CounterWalkinModal,
  SeatClientModal,
  CheckoutModal,
  CancelTicketModal,
} from "../components/owner/dashboard";
import OwnerDashboardPage from "../app/owner/page";
import type { Stylist, Ticket } from "../lib/api";

describe("Batch 5: Owner Dashboard Floor Modular Components Suite", () => {
  const mockStylists: Stylist[] = [
    {
      id: "stylist-1",
      salonId: "salon-1",
      name: "Ramesh Sharma",
      phone: "9876543210",
      avgDurationMinutes: 25,
      isOwner: true,
    },
    {
      id: "stylist-2",
      salonId: "salon-1",
      name: "Vikram Singh",
      phone: "9876543211",
      avgDurationMinutes: 20,
    },
  ];

  const mockTickets: Ticket[] = [
    {
      id: "ticket-1",
      salonId: "salon-1",
      ticketNumber: 101,
      customerName: "Aman Verma",
      customerPhone: "9876500001",
      status: "IN_CHAIR",
      stylistId: "stylist-1",
      serviceName: "Haircut & Beard Trim",
      totalPrice: 250,
      estimatedWaitMinutes: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: "ticket-2",
      salonId: "salon-1",
      ticketNumber: 102,
      customerName: "Rahul Kapoor",
      customerPhone: "9876500002",
      status: "SUMMONED",
      stylistId: "stylist-2",
      serviceName: "Classic Haircut",
      totalPrice: 150,
      estimatedWaitMinutes: 5,
      createdAt: new Date().toISOString(),
    },
    {
      id: "ticket-3",
      salonId: "salon-1",
      ticketNumber: 103,
      customerName: "Deepak Joshi",
      status: "WAITING",
      serviceName: "Beard Styling",
      totalPrice: 100,
      estimatedWaitMinutes: 25,
      createdAt: new Date().toISOString(),
    },
  ];

  describe("OwnerKpiSummary Component", () => {
    it("should render KPI summary cards with correctly formatted metrics", () => {
      const html = renderToString(
        React.createElement(OwnerKpiSummary, {
          metrics: {
            todayServedCount: 14,
            todayRevenue: 3850,
            averageServiceDurationMinutes: 22,
          },
          loading: false,
          waitingCount: 3,
          summonedCount: 1,
          inServiceCount: 2,
          totalStylists: 4,
        })
      );

      expect(html).toContain("Clients Served Today");
      expect(html).toContain("14");
      expect(html).toContain("Today Revenue");
      expect(html).toContain("3,850");
      expect(html).toContain("Currently Waiting");
      expect(html).toContain("Chairs Active");
      expect(html).toContain("Working stations occupied");
    });
  });

  describe("ChairsFloorGrid Component", () => {
    it("should render stylist chairs with status, customer names, and touch buttons", () => {
      const inService = [mockTickets[0]];
      const summoned = [mockTickets[1]];
      const waiting = [mockTickets[2]];

      const html = renderToString(
        React.createElement(ChairsFloorGrid, {
          stylists: mockStylists,
          inServiceTickets: inService,
          summonedTickets: summoned,
          waitingTickets: waiting,
          onOpenCheckout: () => {},
          onOpenSeatModal: () => {},
          onSoftBump: () => {},
        })
      );

      expect(html).toContain("Chairs &amp; Stylist Floor Status");
      expect(html).toContain("Ramesh Sharma");
      expect(html).toContain("IN SERVICE");
      expect(html).toContain("101");
      expect(html).toContain("Aman Verma");
      expect(html).toContain("Finish &amp; Bill");

      expect(html).toContain("Vikram Singh");
      expect(html).toContain("SUMMONED");
      expect(html).toContain("102");
      expect(html).toContain("Rahul Kapoor");
      expect(html).toContain("Seat Now");
      expect(html).toContain("Hold 3m");
    });
  });

  describe("ActiveQueueTable Component", () => {
    it("should render active queue list with customer details and action triggers", () => {
      const html = renderToString(
        React.createElement(ActiveQueueTable, {
          activeTickets: mockTickets,
          loading: false,
          actionLoadingId: null,
          onRefresh: () => {},
          onOpenCheckout: () => {},
          onOpenSeatModal: () => {},
          onSummon: () => {},
          onSoftBump: () => {},
          onRequestCancel: () => {},
          onOpenQuickAdd: () => {},
        })
      );

      expect(html).toContain("Active Queue Clients");
      expect(html).toContain("Active");
      expect(html).toContain("3");
      expect(html).toContain("Aman Verma");
      expect(html).toContain("Rahul Kapoor");
      expect(html).toContain("Deepak Joshi");
      expect(html).toContain("IN CHAIR");
      expect(html).toContain("SUMMONED");
      expect(html).toContain("Summon");
      expect(html).toContain("Seat");
      // Verify mobile-first touch target standard >= 44px
      expect(html).toContain("min-h-[44px]");
    });

    it("should render clean empty state when active queue has zero tickets", () => {
      const html = renderToString(
        React.createElement(ActiveQueueTable, {
          activeTickets: [],
          loading: false,
          actionLoadingId: null,
          onRefresh: () => {},
          onOpenCheckout: () => {},
          onOpenSeatModal: () => {},
          onSummon: () => {},
          onSoftBump: () => {},
          onRequestCancel: () => {},
          onOpenQuickAdd: () => {},
        })
      );

      expect(html).toContain("No clients currently waiting in the queue.");
      expect(html).toContain("+ Add Walk-In Client Now");
    });
  });

  describe("OperationalSurfacesCard Component", () => {
    it("should render 4 launch links to operational touchpoints with correct URLs", () => {
      const html = renderToString(
        React.createElement(OperationalSurfacesCard, {
          currentSlug: "ramesh-barber",
        })
      );

      expect(html).toContain("Operational Surfaces");
      expect(html).toContain("Staff Chair Working Station");
      expect(html).toContain("/s/ramesh-barber/station");
      expect(html).toContain("Public Lobby TV Board");
      expect(html).toContain("/s/ramesh-barber/tv");
      expect(html).toContain("Customer Door QR Page");
      expect(html).toContain("/s/ramesh-barber");
      expect(html).toContain("Printable Mirror Poster");
      expect(html).toContain("/owner/links?salon=ramesh-barber");
    });
  });

  describe("Owner Dashboard Modals", () => {
    it("should render CounterWalkinModal when open", () => {
      const html = renderToString(
        React.createElement(CounterWalkinModal, {
          isOpen: true,
          onClose: () => {},
          salonSlug: "ramesh-barber",
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Counter Walk-In Check-In");
      expect(html).toContain("Client Name *");
      expect(html).toContain("Mobile Phone");
      expect(html).toContain("Issue Ticket &amp; Enqueue");
    });

    it("should render SeatClientModal when ticket is selected", () => {
      const html = renderToString(
        React.createElement(SeatClientModal, {
          ticket: mockTickets[2],
          stylists: mockStylists,
          inServiceTickets: [mockTickets[0]],
          onClose: () => {},
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Seat Client in Chair");
      expect(html).toContain("103");
      expect(html).toContain("Deepak Joshi");
      expect(html).toContain("Ramesh Sharma");
      expect(html).toContain("Vikram Singh");
      expect(html).toContain("Confirm Seating");
    });

    it("should render CheckoutModal with payment methods", () => {
      const html = renderToString(
        React.createElement(CheckoutModal, {
          ticket: mockTickets[0],
          onClose: () => {},
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Complete Service &amp; Collect Bill");
      expect(html).toContain("Final Bill Amount (₹)");
      expect(html).toContain("Cash Collected");
      expect(html).toContain("UPI / Online QR");
      expect(html).toContain("Mark Paid &amp; Free Seat");
    });

    it("should render CancelTicketModal when target ticket is selected", () => {
      const html = renderToString(
        React.createElement(CancelTicketModal, {
          ticket: mockTickets[2],
          onClose: () => {},
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Cancel Queue Ticket");
      expect(html).toContain("103");
      expect(html).toContain("Deepak Joshi");
      expect(html).toContain("Confirm Cancellation");
    });
  });

  describe("OwnerDashboardPage Integration", () => {
    it("should render OwnerDashboardPage with Suspense boundary without runtime error", () => {
      const html = renderToString(React.createElement(OwnerDashboardPage));
      expect(html).toBeDefined();
    });
  });
});
