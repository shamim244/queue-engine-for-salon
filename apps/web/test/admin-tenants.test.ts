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
  usePathname: () => "/admin/tenants",
  useSearchParams: () => new URLSearchParams(),
}));

import {
  TenantSearchFilterBar,
  getTenantTableColumns,
  AddTenantModal,
  InspectTenantModal,
  DeleteTenantModal,
} from "../components/admin/tenants";
import AdminTenantsPage from "../app/admin/tenants/page";
import type { Salon } from "../lib/api";

describe("Batch 6: Admin Tenants Hub Modular Components Suite", () => {
  const mockSalons: Salon[] = [
    {
      id: "salon-1",
      name: "Enrich Salons Enterprise",
      slug: "enrich-salons",
      phone: "+91 9876543210",
      currency: "INR",
      countryCode: "IN",
      organizationId: "org-aura",
      status: "ACTIVE",
      stylists: [
        { id: "st-1", salonId: "salon-1", name: "Ravi", isAvailable: true },
        { id: "st-2", salonId: "salon-1", name: "Sunil", isAvailable: false },
      ],
      services: [
        { id: "srv-1", salonId: "salon-1", name: "Haircut", basePrice: 200, estimatedDurationMinutes: 30, pricingType: "FIXED", isAddOn: false },
      ],
      createdAt: "2026-01-15T08:00:00Z",
    },
    {
      id: "salon-2",
      name: "Looks Grooming Pro",
      slug: "looks-grooming",
      phone: "+91 9876543211",
      currency: "INR",
      countryCode: "IN",
      status: "SUSPENDED",
      stylists: [],
      services: [],
      createdAt: "2026-02-10T10:30:00Z",
    },
  ];

  describe("TenantSearchFilterBar Component", () => {
    it("should render search input and plan filter buttons", () => {
      const html = renderToString(
        React.createElement(TenantSearchFilterBar, {
          globalFilter: "",
          onGlobalFilterChange: () => {},
          planFilter: "ALL",
          onPlanFilterChange: () => {},
        })
      );

      expect(html).toContain("Search by name, slug, phone...");
      expect(html).toContain("All Plans");
      expect(html).toContain("Starter Plan");
      expect(html).toContain("Pro Plan");
      expect(html).toContain("Enterprise");
    });

    it("should display search value when provided", () => {
      const html = renderToString(
        React.createElement(TenantSearchFilterBar, {
          globalFilter: "Enrich",
          onGlobalFilterChange: () => {},
          planFilter: "PRO",
          onPlanFilterChange: () => {},
        })
      );

      expect(html).toContain("value=\"Enrich\"");
    });
  });

  describe("getTenantTableColumns Definition", () => {
    it("should construct valid column definitions with accessors and render functions", () => {
      const onInspect = mock((_s: Salon) => {});
      const columns = getTenantTableColumns(onInspect);

      expect(columns.length).toBeGreaterThanOrEqual(6);
      const salonCol = columns.find((c) => c.header === "Salon / Branch");
      expect(salonCol).toBeDefined();

      if (salonCol) {
        const row = { original: mockSalons[0] } as any;
        const rendered = renderToString((salonCol.cell as any)({ row }));
        expect(rendered).toContain("Enrich Salons Enterprise");
        expect(rendered).toContain("enrich-salons");
        expect(rendered).toContain("+91 9876543210");
      }

      const planCol = columns.find((c) => c.header === "SaaS Plan");
      expect(planCol).toBeDefined();
      if (planCol) {
        const row = { original: mockSalons[0] } as any;
        const rendered = renderToString((planCol.cell as any)({ row }));
        expect(rendered).toContain("Pro Plan");
      }

      const actionsCol = columns.find((c) => c.header === "Actions");
      expect(actionsCol).toBeDefined();
      if (actionsCol) {
        const row = { original: mockSalons[0] } as any;
        const rendered = renderToString((actionsCol.cell as any)({ row }));
        expect(rendered).toContain("Manage");
        expect(rendered).toContain("Owner Hub");
      }
    });
  });

  describe("AddTenantModal Component", () => {
    it("should render modal form when open with touch-friendly fields", () => {
      const html = renderToString(
        React.createElement(AddTenantModal, {
          isOpen: true,
          onClose: () => {},
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Register New Salon Branch");
      expect(html).toContain("Salon / Barber Shop Name");
      expect(html).toContain("Contact Phone Number");
      expect(html).toContain("Create Salon Tenant");
    });
  });

  describe("InspectTenantModal Component", () => {
    it("should render modal with tenant details and tabs", () => {
      const html = renderToString(
        React.createElement(InspectTenantModal, {
          salon: mockSalons[0],
          isOpen: true,
          onClose: () => {},
          onRefresh: () => {},
          onDeleteRequest: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Enrich Salons Enterprise");
      expect(html).toContain("Overview &amp; Settings");
      expect(html).toContain("Stylists");
      expect(html).toContain("Services");
      expect(html).toContain("Danger Zone");
      expect(html).toContain("Save Salon Settings");
    });

    it("should return null if salon is null", () => {
      const html = renderToString(
        React.createElement(InspectTenantModal, {
          salon: null,
          isOpen: true,
          onClose: () => {},
          onRefresh: () => {},
          onDeleteRequest: () => {},
          showToast: () => {},
        })
      );

      expect(html).toBe("");
    });
  });

  describe("DeleteTenantModal Component", () => {
    it("should render deletion confirmation dialog when target selected", () => {
      const html = renderToString(
        React.createElement(DeleteTenantModal, {
          salon: mockSalons[1],
          isOpen: true,
          onClose: () => {},
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toContain("Permanently Delete");
      expect(html).toContain("Looks Grooming Pro");
      expect(html).toContain("Cancel");
      expect(html).toContain("Confirm Permanent Deletion");
    });

    it("should return null if salon is null", () => {
      const html = renderToString(
        React.createElement(DeleteTenantModal, {
          salon: null,
          isOpen: true,
          onClose: () => {},
          onSuccess: () => {},
          showToast: () => {},
        })
      );

      expect(html).toBe("");
    });
  });

  describe("AdminTenantsPage Integration", () => {
    it("should render AdminTenantsPage without crashing", () => {
      const html = renderToString(React.createElement(AdminTenantsPage));
      expect(html).toContain("Tenant Directory");
      expect(html).toContain("All Plans");
      expect(html).toContain("Onboard Salon Wizard");
    });
  });
});
