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
  usePathname: () => "/owner/staff",
  useSearchParams: () => new URLSearchParams("salon=ramesh-barber"),
}));

import {
  UnlinkedStationsBanner,
  StaffKpiCards,
  StaffRosterCard,
  AddStaffModal,
  EditStaffModal,
  StaffPinModal,
  ResetPasswordModal,
  KillSwitchModal,
  DeleteStaffModal,
} from "../components/owner/staff";
import OwnerStaffPage from "../app/owner/staff/page";
import type { AuthUser, Stylist } from "../lib/api";

describe("Batch 4: Owner Staff Desk Modular Components Suite", () => {
  const mockStylist: Stylist = {
    id: "stylist-1",
    salonId: "salon-1",
    name: "Ramesh Sharma",
    phone: "9876543210",
    avgDurationMinutes: 25,
    pin: "1234",
    isOwner: true,
  };

  const mockStaffUser: AuthUser = {
    id: "user-1",
    salonId: "salon-1",
    username: "ramesh_sharma",
    fullName: "Ramesh Sharma",
    email: "ramesh@salon.com",
    phone: "9876543210",
    role: "SALON_OWNER",
    status: "ACTIVE",
    staffId: "stylist-1",
    pin: "1234",
  };

  describe("StaffKpiCards Component", () => {
    it("should render KPI summary cards with correct metrics", () => {
      const html = renderToString(
        React.createElement(StaffKpiCards, {
          totalStaff: 4,
          activeStaffCount: 3,
          stylistsCount: 5,
          configuredPinsCount: 2,
        })
      );

      expect(html).toContain("Total Staff Users");
      expect(html).toContain(">4<");
      expect(html).toContain("Active Stations");
      expect(html).toContain("3");
      expect(html).toContain("Mirror Tablet PINs");
      expect(html).toContain("2");
      expect(html).toContain("Branch Capacity");
      expect(html).toContain("Active Stylists");
    });
  });

  describe("UnlinkedStationsBanner Component", () => {
    it("should return null when there are no unlinked stylists", () => {
      const html = renderToString(
        React.createElement(UnlinkedStationsBanner, {
          unlinkedStylists: [],
          onProvisionLogin: () => {},
        })
      );
      expect(html).toBe("");
    });

    it("should render banner with unlinked stations when stylists lack accounts", () => {
      const unlinked = [
        { id: "st-legacy-1", salonId: "s-1", name: "Suresh Legacy", avgDurationMinutes: 20 },
      ];
      const html = renderToString(
        React.createElement(UnlinkedStationsBanner, {
          unlinkedStylists: unlinked,
          onProvisionLogin: () => {},
        })
      );

      expect(html).toContain("Legacy Stations Found");
      expect(html).toContain("Suresh Legacy");
      expect(html).toContain("+ Create Login for");
      expect(html).toContain("Suresh");
    });
  });

  describe("StaffRosterCard Component", () => {
    it("should render staff card with details, masked phone, speed, and touch-friendly actions", () => {
      const html = renderToString(
        React.createElement(StaffRosterCard, {
          user: mockStaffUser,
          matchedStylist: mockStylist,
          onEdit: () => {},
          onPin: () => {},
          onResetPassword: () => {},
          onDelete: () => {},
          onKillSwitch: () => {},
        })
      );

      expect(html).toContain("Ramesh Sharma");
      expect(html).toContain("ramesh_sharma");
      expect(html).toContain("Lead / Owner");
      expect(html).toContain("mins");
      expect(html).toContain("25");
      expect(html).toContain("Configured (••••)");
      expect(html).toContain("Edit Details");
      expect(html).toContain("Update PIN");
      expect(html).toContain("Reset Pwd");
      expect(html).toContain("Remove");
      expect(html).toContain("Emergency Kill-Switch");
      // Verify mobile-first touch target standard >= 44px
      expect(html).toContain("min-h-[44px]");
    });

    it("should render suspended state correctly", () => {
      const suspendedUser: AuthUser = {
        ...mockStaffUser,
        status: "SUSPENDED",
      };

      const html = renderToString(
        React.createElement(StaffRosterCard, {
          user: suspendedUser,
          matchedStylist: mockStylist,
          onEdit: () => {},
          onPin: () => {},
          onResetPassword: () => {},
          onDelete: () => {},
          onKillSwitch: () => {},
        })
      );

      expect(html).toContain("Suspended");
      expect(html).toContain("opacity-70");
    });
  });

  describe("Staff Modals Rendering", () => {
    it("should render AddStaffModal when open", () => {
      const html = renderToString(
        React.createElement(AddStaffModal, {
          isOpen: true,
          onClose: () => {},
          salonId: "salon-1",
          salonSlug: "ramesh-barber",
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Add Team Member");
      expect(html).toContain("Full Name *");
      expect(html).toContain("Username *");
      expect(html).toContain("Login Password *");
      expect(html).toContain("Service Speed Pace");
    });

    it("should render EditStaffModal when open with user data", () => {
      const html = renderToString(
        React.createElement(EditStaffModal, {
          isOpen: true,
          onClose: () => {},
          user: mockStaffUser,
          matchedStylist: mockStylist,
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Edit Profile");
      expect(html).toContain("ramesh_sharma");
      expect(html).toContain("4-Digit Mirror PIN");
      expect(html).toContain("Account Status");
    });

    it("should render StaffPinModal when open", () => {
      const html = renderToString(
        React.createElement(StaffPinModal, {
          isOpen: true,
          onClose: () => {},
          user: mockStaffUser,
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Quick Mirror PIN");
      expect(html).toContain("Ramesh Sharma");
      expect(html).toContain("Enter 4-Digit Numeric PIN");
    });

    it("should render ResetPasswordModal when open", () => {
      const html = renderToString(
        React.createElement(ResetPasswordModal, {
          isOpen: true,
          onClose: () => {},
          user: mockStaffUser,
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Reset Password for");
      expect(html).toContain("ramesh_sharma");
      expect(html).toContain("New Password *");
    });

    it("should render KillSwitchModal when target is selected", () => {
      const html = renderToString(
        React.createElement(KillSwitchModal, {
          user: mockStaffUser,
          onClose: () => {},
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Revoke Sessions for");
      expect(html).toContain("ramesh_sharma");
      expect(html).toContain("Revoke Sessions Immediately");
    });

    it("should render DeleteStaffModal when target is selected", () => {
      const html = renderToString(
        React.createElement(DeleteStaffModal, {
          user: mockStaffUser,
          onClose: () => {},
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Remove");
      expect(html).toContain("ramesh_sharma");
      expect(html).toContain("from Salon?");
      expect(html).toContain("Confirm Deletion");
    });
  });

  describe("OwnerStaffPage Integration", () => {
    it("should render OwnerStaffPage with Suspense boundary without runtime error", () => {
      const html = renderToString(React.createElement(OwnerStaffPage));
      expect(html).toBeDefined();
    });
  });
});
