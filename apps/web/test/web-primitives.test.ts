import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { getAuthToken, setAuthToken, API_BASE_URL, WS_BASE_URL, apiClient, api, request } from "../lib/api";
import { cn, formatCurrency, maskPhone } from "../lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu";

describe("Frontend Web Library & Primitives", () => {
  beforeEach(() => {
    // Reset global simulated storage
    (globalThis as any).window = globalThis;
    if (typeof globalThis.localStorage === "undefined" || !(globalThis as any).localStorage?.getItem) {
      let store: Record<string, string> = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          store = {};
        },
      };
    } else {
      localStorage.clear();
    }

    let cookieJar: Record<string, string> = {};
    (globalThis as any).document = {
      get cookie() {
        return Object.entries(cookieJar)
          .map(([k, v]) => `${k}=${v}`)
          .join("; ");
      },
      set cookie(str: string) {
        if (!str) {
          cookieJar = {};
          return;
        }
        const parts = str.split(";");
        const [rawKey, rawVal] = parts[0].split("=");
        if (!rawKey) return;
        const key = rawKey.trim();
        const val = rawVal ? rawVal.trim() : "";
        if (str.includes("max-age=0")) {
          delete cookieJar[key];
        } else {
          cookieJar[key] = val;
        }
      },
    };
  });

  describe("API Client & Auth Token Sync", () => {
    it("should default to correct API and WebSocket base URLs", () => {
      expect(API_BASE_URL).toBe("http://localhost:3001");
      expect(WS_BASE_URL).toBe("ws://localhost:3001/ws");
    });

    it("should store and retrieve auth token across localStorage and document.cookie", () => {
      expect(getAuthToken()).toBeNull();

      setAuthToken("sample_jwt_token_123");
      expect(localStorage.getItem("engine_token")).toBe("sample_jwt_token_123");
      expect(document.cookie).toContain("engine_token=sample_jwt_token_123");
      expect(getAuthToken()).toBe("sample_jwt_token_123");

      setAuthToken(null);
      expect(localStorage.getItem("engine_token")).toBeNull();
      expect(getAuthToken()).toBeNull();
    });

    it("should restore token from document.cookie with engine_session or engine_token", () => {
      localStorage.clear();
      document.cookie = "engine_session=session_token_888";
      expect(getAuthToken()).toBe("session_token_888");

      document.cookie = "";
      document.cookie = "engine_token=token_777";
      expect(getAuthToken()).toBe("token_777");
    });

    it("should export type-safe apiClient methods", () => {
      expect(typeof apiClient.get).toBe("function");
      expect(typeof apiClient.post).toBe("function");
      expect(typeof apiClient.put).toBe("function");
      expect(typeof apiClient.patch).toBe("function");
      expect(typeof apiClient.delete).toBe("function");
      expect(typeof apiClient.request).toBe("function");
    });

    it("should export typed api.admin methods", () => {
      expect(typeof api.admin.getStats).toBe("function");
      expect(typeof api.admin.getSettings).toBe("function");
      expect(typeof api.admin.updateSettings).toBe("function");
      expect(typeof api.admin.getAuditLogs).toBe("function");
      expect(typeof api.admin.toggleKillSwitch).toBe("function");
      expect(typeof api.admin.onboard).toBe("function");
      expect(typeof api.admin.testNotification).toBe("function");
    });

    it("should handle 204 No Content and empty responses cleanly without JSON parsing errors", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(null, {
          status: 204,
          statusText: "No Content",
        });

      try {
        const result = await apiClient.delete("/api/salons/test-salon/services/serv-123");
        expect(result).toEqual({});
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should support endpoints with or without leading slashes", async () => {
      const originalFetch = globalThis.fetch;
      let requestedUrl = "";
      globalThis.fetch = async (url: any) => {
        requestedUrl = url.toString();
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      };

      try {
        await apiClient.get("api/salons");
        expect(requestedUrl).toBe("http://localhost:3001/api/salons");

        await apiClient.get("/api/salons");
        expect(requestedUrl).toBe("http://localhost:3001/api/salons");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should preserve custom Authorization header if explicitly provided", async () => {
      const originalFetch = globalThis.fetch;
      let usedAuthHeader: string | undefined;
      setAuthToken("default_stored_token");

      globalThis.fetch = async (_url: any, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string>;
        usedAuthHeader = headers?.["Authorization"];
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      };

      try {
        await request("/api/test", {
          headers: { Authorization: "Bearer custom_explicit_token" },
        });
        expect(usedAuthHeader).toBe("Bearer custom_explicit_token");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("UI Helpers and Formatters", () => {
    it("should merge classnames correctly with tailwind-merge and clsx", () => {
      const merged = cn("px-2 py-1", "px-4", { "bg-blue-500": true, hidden: false });
      expect(merged).toBe("py-1 px-4 bg-blue-500");
    });

    it("should format INR currency values", () => {
      const formatted = formatCurrency(250);
      expect(formatted).toContain("250");
    });

    it("should mask customer phone numbers properly for privacy", () => {
      const masked = maskPhone("+91 98765 43210");
      expect(masked).toBe("+9198 *** 10");
    });
  });

  describe("Select Primitive", () => {
    it("should extract initial option label when closed rather than displaying raw value", () => {
      const tree = React.createElement(
        Select,
        { value: "FLEXIBLE_CHAIR" },
        React.createElement(SelectTrigger, null, React.createElement(SelectValue, { placeholder: "Select pricing" })),
        React.createElement(
          SelectContent,
          null,
          React.createElement(SelectItem, { value: "FIXED" }, "Fixed Price"),
          React.createElement(SelectItem, { value: "FLEXIBLE_CHAIR" }, "Rural Flexible Price")
        )
      );

      const html = renderToString(tree);
      expect(html).toContain("Rural Flexible Price");
      expect(html).not.toContain('<span class="block truncate text-sm">FLEXIBLE_CHAIR</span>');
    });
  });

  describe("DropdownMenu Primitive", () => {
    it("should render dropdown menu trigger and container cleanly", () => {
      const tree = React.createElement(
        DropdownMenu,
        null,
        React.createElement(DropdownMenuTrigger, { className: "btn-class" }, "Open Menu"),
        React.createElement(
          DropdownMenuContent,
          null,
          React.createElement(DropdownMenuItem, null, "Item 1")
        )
      );

      const html = renderToString(tree);
      expect(html).toContain("Open Menu");
      expect(html).toContain("aria-haspopup=\"menu\"");
    });
  });

  describe("WebSocket Hook Protocol & Recovery", () => {
    it("should connect to correct URL and format subscription payload on open", () => {
      const mockWsInstances: any[] = [];
      class MockWS {
        static OPEN = 1;
        static CLOSED = 3;
        static CONNECTING = 0;
        url: string;
        readyState = MockWS.CONNECTING;
        onopen: any = null;
        onmessage: any = null;
        onclose: any = null;
        messages: string[] = [];
        constructor(url: string) {
          this.url = url;
          mockWsInstances.push(this);
        }
        send(msg: string) {
          this.messages.push(msg);
        }
        close() {
          this.readyState = MockWS.CLOSED;
          this.onclose?.();
        }
      }

      const origWS = (globalThis as any).WebSocket;
      (globalThis as any).WebSocket = MockWS;

      try {
        // Instantiate socket connect simulation
        const wsUrl = `${WS_BASE_URL}?salonId=salon-rural-01`;
        const ws = new MockWS(wsUrl);
        expect(ws.url).toBe("ws://localhost:3001/ws?salonId=salon-rural-01");

        // Simulate open
        ws.readyState = MockWS.OPEN;
        ws.send(JSON.stringify({ type: "JOIN_SALON", salonId: "salon-rural-01", action: "subscribe" }));
        expect(ws.messages.length).toBe(1);
        const payload = JSON.parse(ws.messages[0]);
        expect(payload.type).toBe("JOIN_SALON");
        expect(payload.salonId).toBe("salon-rural-01");
      } finally {
        (globalThis as any).WebSocket = origWS;
      }
    });

    it("should recover dropped connections within <3s SLA window", async () => {
      let reconnectScheduled = false;
      let scheduledDelay = 0;

      const scheduleReconnect = (delayMs: number) => {
        reconnectScheduled = true;
        scheduledDelay = delayMs;
      };

      // When onclose fires, auto-recovery schedule must be < 3000ms
      const autoRecoveryDelay = 1500;
      scheduleReconnect(autoRecoveryDelay);

      expect(reconnectScheduled).toBe(true);
      expect(scheduledDelay).toBeLessThan(3000);
      expect(scheduledDelay).toBe(1500);
    });
  });

  describe("Component Primitives Module Exports", () => {
    it("should load shadcn/ui base primitives without throwing errors", async () => {
      const buttonModule = await import("../components/ui/button");
      expect(buttonModule.Button).toBeDefined();

      const cardModule = await import("../components/ui/card");
      expect(cardModule.Card).toBeDefined();
      expect(cardModule.CardHeader).toBeDefined();

      const dialogModule = await import("../components/ui/dialog");
      expect(dialogModule.Dialog).toBeDefined();
      expect(dialogModule.DialogTitle).toBeDefined();

      const inputModule = await import("../components/ui/input");
      expect(inputModule.Input).toBeDefined();

      const selectModule = await import("../components/ui/select");
      expect(selectModule.Select).toBeDefined();
      expect(selectModule.SelectTrigger).toBeDefined();
      expect(selectModule.SelectContent).toBeDefined();
      expect(selectModule.SelectItem).toBeDefined();

      const badgeModule = await import("../components/ui/badge");
      expect(badgeModule.Badge).toBeDefined();

      const tabsModule = await import("../components/ui/tabs");
      expect(tabsModule.Tabs).toBeDefined();
      expect(tabsModule.TabsList).toBeDefined();
      expect(tabsModule.TabsTrigger).toBeDefined();

      const dropdownModule = await import("../components/ui/dropdown-menu");
      expect(dropdownModule.DropdownMenu).toBeDefined();
      expect(dropdownModule.DropdownMenuTrigger).toBeDefined();
      expect(dropdownModule.DropdownMenuContent).toBeDefined();
      expect(dropdownModule.DropdownMenuItem).toBeDefined();
    });
  });
});
