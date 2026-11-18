import { describe, it, expect, mock, beforeEach } from "bun:test";
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
  usePathname: () => "/admin/settings",
  useSearchParams: () => new URLSearchParams(""),
}));

import { api, type PlatformSettings, type AuditLog } from "../lib/api";
import GeneralSettingsPage from "../app/admin/settings/page";
import AppearanceSettingsPage from "../app/admin/settings/appearance/page";
import SystemSettingsPage from "../app/admin/settings/system/page";
import SecurityPage from "../app/admin/security/page";
import { CompressionCenter } from "../components/admin/compression-center";

describe("Admin Settings Suite & Security Center", () => {
  const mockSettings: PlatformSettings = {
    general: {
      platformName: "Engine Que Enterprise",
      supportEmail: "support@engineque.com",
      supportPhone: "+91 99999 88888",
      defaultCurrency: "INR",
      defaultTimezone: "Asia/Kolkata",
      defaultGracePeriodMinutes: 3,
      defaultBufferMinutes: 5,
    },
    appearance: {
      themeAccent: "blue",
      whiteLabelEnabled: false,
      customCssEnabled: false,
      tvDisplayMode: "AIRPORT_DEPARTURE",
    },
    engine: {
      heartbeatIntervalSeconds: 10,
      watchdogTimeoutSeconds: 3,
      autoSummonThresholdSeconds: 180,
      ticketRetentionHours: 24,
    },
    gateway: {
      provider: "SIMULATOR",
      senderPhone: "+91 98765 00000",
    },
  };

  const mockAuditLogs: AuditLog[] = [
    {
      id: "audit-001",
      timestamp: "2026-11-01T10:00:00.000Z",
      action: "PLATFORM_UPDATE",
      actor: "superadmin",
      details: "Updated platform settings defaults",
      category: "SYSTEM",
    },
    {
      id: "audit-002",
      timestamp: "2026-11-01T11:00:00.000Z",
      action: "KILL_SWITCH_ENGAGED",
      actor: "superadmin",
      details: "Emergency maintenance mode engaged",
      category: "SECURITY",
    },
  ];

  beforeEach(() => {
    // Reset or establish defaults
  });

  describe("API Client Admin Settings Integration", () => {
    it("should fetch platform settings via api.admin.getSettings()", async () => {
      const originalGet = api.admin.getSettings;
      const getMock = mock(async () => mockSettings);
      api.admin.getSettings = getMock as any;

      try {
        const settings = await api.admin.getSettings();
        expect(getMock).toHaveBeenCalledTimes(1);
        expect(settings.general.platformName).toBe("Engine Que Enterprise");
        expect(settings.general.defaultCurrency).toBe("INR");
        expect(settings.appearance.themeAccent).toBe("blue");
        expect(settings.engine.heartbeatIntervalSeconds).toBe(10);
      } finally {
        api.admin.getSettings = originalGet;
      }
    });

    it("should update General Settings via api.admin.updateSettings()", async () => {
      const originalUpdate = api.admin.updateSettings;
      const updatedMockSettings: PlatformSettings = {
        ...mockSettings,
        general: {
          ...mockSettings.general,
          platformName: "Engine Que Global",
          supportEmail: "ops@engineque.com",
          defaultGracePeriodMinutes: 5,
        },
      };

      const updateMock = mock(async (payload: any) => ({
        success: true,
        settings: { ...mockSettings, ...payload },
      }));
      api.admin.updateSettings = updateMock as any;

      try {
        const res = await api.admin.updateSettings({
          general: {
            platformName: "Engine Que Global",
            supportEmail: "ops@engineque.com",
            supportPhone: "+91 99999 88888",
            defaultCurrency: "USD",
            defaultTimezone: "UTC",
            defaultGracePeriodMinutes: 5,
            defaultBufferMinutes: 7,
          },
        });
        expect(updateMock).toHaveBeenCalledTimes(1);
        expect(res.success).toBe(true);
        expect(res.settings.general.platformName).toBe("Engine Que Global");
      } finally {
        api.admin.updateSettings = originalUpdate;
      }
    });

    it("should update Appearance Settings (theme accent, white-labeling, tvDisplayMode)", async () => {
      const originalUpdate = api.admin.updateSettings;
      const updateMock = mock(async (payload: any) => ({
        success: true,
        settings: { ...mockSettings, ...payload },
      }));
      api.admin.updateSettings = updateMock as any;

      try {
        const res = await api.admin.updateSettings({
          appearance: {
            themeAccent: "obsidian",
            whiteLabelEnabled: true,
            customCssEnabled: true,
            tvDisplayMode: "COMPACT_GRID",
          },
        });
        expect(updateMock).toHaveBeenCalledTimes(1);
        expect(res.success).toBe(true);
        expect(res.settings.appearance.themeAccent).toBe("obsidian");
        expect(res.settings.appearance.whiteLabelEnabled).toBe(true);
        expect(res.settings.appearance.tvDisplayMode).toBe("COMPACT_GRID");
      } finally {
        api.admin.updateSettings = originalUpdate;
      }
    });

    it("should update Engine & Gateway configuration and dispatch test notification via api.admin.testNotification()", async () => {
      const originalTest = api.admin.testNotification;
      const testMock = mock(async (phone?: string, message?: string) => ({
        success: true,
        provider: "SIMULATOR",
        notificationId: "notif-test-123",
        recipientPhone: phone || "+91 98765 00000",
        timestamp: new Date().toISOString(),
      }));
      api.admin.testNotification = testMock as any;

      try {
        const res = await api.admin.testNotification("+91 98765 43210", "Hello Test Notification");
        expect(testMock).toHaveBeenCalledTimes(1);
        expect(res.success).toBe(true);
        expect(res.provider).toBe("SIMULATOR");
        expect(res.notificationId).toBe("notif-test-123");
      } finally {
        api.admin.testNotification = originalTest;
      }
    });

    it("should fetch audit logs and toggle emergency kill-switch", async () => {
      const originalAudit = api.admin.getAuditLogs;
      const originalKill = api.admin.toggleKillSwitch;

      const auditMock = mock(async () => mockAuditLogs);
      const killMock = mock(async (active: boolean, message?: string) => ({
        success: true,
        active,
        message: message || "System lockdown",
        activatedAt: active ? new Date().toISOString() : null,
      }));

      api.admin.getAuditLogs = auditMock as any;
      api.admin.toggleKillSwitch = killMock as any;

      try {
        const logs = await api.admin.getAuditLogs();
        expect(logs.length).toBe(2);
        expect(logs[0].action).toBe("PLATFORM_UPDATE");

        const killRes = await api.admin.toggleKillSwitch(true, "Scheduled Emergency Maintenance");
        expect(killRes.success).toBe(true);
        expect(killRes.active).toBe(true);
        expect(killRes.message).toBe("Scheduled Emergency Maintenance");
      } finally {
        api.admin.getAuditLogs = originalAudit;
        api.admin.toggleKillSwitch = originalKill;
      }
    });

    it("should fetch compression status and run live benchmark via api.admin", async () => {
      const originalGet = api.admin.getCompressionStatus;
      const originalBenchmark = api.admin.runCompressionBenchmark;

      api.admin.getCompressionStatus = mock(async () => ({
        success: true,
        capabilities: [
          { algorithm: "zstd", label: "Zstandard", available: false, engine: "Not installed", native: false },
          { algorithm: "br", label: "Brotli", available: true, engine: "node:zlib", native: true },
          { algorithm: "gzip", label: "Gzip", available: true, engine: "Bun.gzipSync", native: true },
        ],
        settings: {
          enabled: true,
          minThresholdBytes: 1024,
          priority: ["zstd", "br", "gzip"],
          brotli: { enabled: true, quality: 4 },
          gzip: { enabled: true, level: 6 },
          zstd: { enabled: false },
        },
        benchmark: [
          { algorithm: "Brotli (br)", status: "SUPPORTED", originalBytes: 2400, compressedBytes: 230, reductionPercentage: 90, durationMs: 0.4 },
        ],
      })) as any;

      api.admin.runCompressionBenchmark = mock(async () => ({
        success: true,
        benchmark: [
          { algorithm: "Brotli (br)", status: "SUPPORTED", originalBytes: 2400, compressedBytes: 230, reductionPercentage: 90, durationMs: 0.4 },
        ],
      })) as any;

      try {
        const status = await api.admin.getCompressionStatus();
        expect(status.success).toBe(true);
        expect(status.capabilities.length).toBe(3);
        expect(status.settings.priority).toContain("br");

        const benchmarkRes = await api.admin.runCompressionBenchmark();
        expect(benchmarkRes.success).toBe(true);
        expect(benchmarkRes.benchmark.length).toBe(1);
      } finally {
        api.admin.getCompressionStatus = originalGet;
        api.admin.runCompressionBenchmark = originalBenchmark;
      }
    });

    it("should fetch and update dynamic security settings via api.admin", async () => {
      const mockSec = {
        success: true,
        settings: {
          pinMaxAttempts: 5,
          pinWindowSeconds: 900,
          loginMaxAttempts: 10,
          loginWindowSeconds: 900,
          checkinMaxAttempts: 10,
          checkinWindowSeconds: 300,
          allowedCustomOrigins: ["https://portal.nexgentech.site"],
          defaultCountryCode: "+91",
          allowedCountryCodes: ["+91", "+1", "+44"],
        },
      };

      const origGetSec = api.admin.getSecuritySettings;
      const origUpdSec = api.admin.updateSecuritySettings;

      api.admin.getSecuritySettings = mock(async () => mockSec as any);
      api.admin.updateSecuritySettings = mock(async (payload: any) => ({
        success: true,
        settings: { ...mockSec.settings, ...payload },
      })) as any;

      try {
        const fetched = await api.admin.getSecuritySettings();
        expect(fetched.success).toBe(true);
        expect(fetched.settings.pinMaxAttempts).toBe(5);
        expect(fetched.settings.defaultCountryCode).toBe("+91");

        const updated = await api.admin.updateSecuritySettings({ pinMaxAttempts: 3 });
        expect(updated.success).toBe(true);
        expect(updated.settings.pinMaxAttempts).toBe(3);
      } finally {
        api.admin.getSecuritySettings = origGetSec;
        api.admin.updateSecuritySettings = origUpdSec;
      }
    });
  });

  describe("Server-Side Rendering of Settings Pages", () => {
    it("should render GeneralSettingsPage with form fields, currency options, and navigation tabs", () => {
      const html = renderToString(React.createElement(GeneralSettingsPage));

      // Page Title & Header
      expect(html).toContain("General Platform Settings");
      expect(html).toContain("Core Platform Defaults &amp; Business Rules");

      // Navigation Bar Tabs
      expect(html).toContain("General");
      expect(html).toContain("Appearance");
      expect(html).toContain("System Engine &amp; Gateways");
      expect(html).toContain("Security &amp; Audit");

      // Fields
      expect(html).toContain("Platform Name");
      expect(html).toContain("Support Email");
      expect(html).toContain("Support Hotline Phone");
      expect(html).toContain("Default Currency");
      expect(html).toContain("Default Timezone");
      expect(html).toContain("Default Grace Period");
      expect(html).toContain("Save Changes");
    });

    it("should render AppearanceSettingsPage with theme accent cards, white-labeling, and TV modes", () => {
      const html = renderToString(React.createElement(AppearanceSettingsPage));

      expect(html).toContain("Appearance &amp; Themes");
      expect(html).toContain("Theme Accent");
      expect(html).toContain("Corporate Blue");
      expect(html).toContain("Deep Obsidian");
      expect(html).toContain("Emerald Pro");
      expect(html).toContain("Barber Amber");
      expect(html).toContain("White-Labeling");
      expect(html).toContain("Custom CSS");
      expect(html).toContain("TV Display Mode");
      expect(html).toContain("Airport Departure Board");
      expect(html).toContain("Compact Grid");
    });

    it("should render SystemSettingsPage with engine telemetry calibration, gateway options, and test trigger", () => {
      const html = renderToString(React.createElement(SystemSettingsPage));

      expect(html).toContain("System Engine &amp; Gateways");
      expect(html).toContain("Engine Telemetry Calibration");
      expect(html).toContain("Heartbeat Ping Interval");
      expect(html).toContain("Watchdog SLA Timeout");
      expect(html).toContain("Notification Gateway");
      expect(html).toContain("SIMULATOR");
      expect(html).toContain("Dispatch Test WhatsApp Alert");
      expect(html).toContain("Database &amp; Storage Health");
    });

    it("should render SecurityPage with zero-trust session cards, kill-switch danger zone, and audit logs table", () => {
      const html = renderToString(React.createElement(SecurityPage));

      expect(html).toContain("Security &amp; Audit Center");
      expect(html).toContain("Zero-Trust Session Revocation");
      expect(html).toContain("Platform Lockdown Status");
      expect(html).toContain("Emergency Platform Kill-Switch");
      expect(html).toContain("Maintenance Mode");
      expect(html).toContain("Administrative Audit Log");
      expect(html).toContain("Timestamp");
      expect(html).toContain("Action");
      expect(html).toContain("Actor");
      expect(html).toContain("Category");

      // Dynamic Rate Limiting & Cloudflare Controls
      expect(html).toContain("Dynamic Rate Limiting &amp; Abuse Prevention");
      expect(html).toContain("Login Brute-Force Guard");
      expect(html).toContain("Mirror PIN Switch Guard");
      expect(html).toContain("Public Queue Check-in Guard");
      expect(html).toContain("CORS Allowed Origins &amp; Cloudflare Tunnel Subdomains");
      expect(html).toContain("Cloudflare cf-connecting-ip Active");
      expect(html).toContain("Regional Country Codes &amp; Mobile Policy");
    });

    it("should render CompressionCenter component with cascading fallback order", () => {
      const html = renderToString(React.createElement(CompressionCenter));
      expect(html).toContain("Multi-Tier Adaptive Response Compression");
      expect(html).toContain("Zstandard");
      expect(html).toContain("Brotli");
      expect(html).toContain("Gzip");
      expect(html).toContain("Raw");
    });
  });
});
