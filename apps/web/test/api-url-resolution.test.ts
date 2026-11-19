import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getApiBaseUrl, getWsBaseUrl } from "../lib/api";

describe("API & WebSocket URL Resolution Suite (.env Authority)", () => {
  const originalEnv = { ...process.env };
  const originalWindow = globalThis.window;

  afterEach(() => {
    process.env = { ...originalEnv };
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }
  });

  describe("Server-side (Node / SSR) Resolution", () => {
    it("returns INTERNAL_API_URL when set on server", () => {
      delete (globalThis as any).window;
      process.env.INTERNAL_API_URL = "http://127.0.0.1:8000";
      expect(getApiBaseUrl()).toBe("http://127.0.0.1:8000");
    });

    it("falls back to NEXT_PUBLIC_API_URL or localhost:3001 on server when INTERNAL_API_URL is missing", () => {
      delete (globalThis as any).window;
      delete process.env.INTERNAL_API_URL;
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
      expect(getApiBaseUrl()).toBe("http://localhost:3001");

      delete process.env.NEXT_PUBLIC_API_URL;
      expect(getApiBaseUrl()).toBe("http://localhost:3001");
    });

    it("returns NEXT_PUBLIC_WS_URL or fallback on server", () => {
      delete (globalThis as any).window;
      process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:3001/ws";
      expect(getWsBaseUrl()).toBe("ws://localhost:3001/ws");

      delete process.env.NEXT_PUBLIC_WS_URL;
      expect(getWsBaseUrl()).toBe("ws://localhost:3001/ws");
    });
  });

  describe("Client-side (Browser Window) Resolution", () => {
    it("uses localhost:3001 when running on localhost", () => {
      (globalThis as any).window = {
        location: {
          protocol: "http:",
          host: "localhost:3000",
          hostname: "localhost",
        },
      };
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
      process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:3001/ws";

      expect(getApiBaseUrl()).toBe("http://localhost:3001");
      expect(getWsBaseUrl()).toBe("ws://localhost:3001/ws");
    });

    it("honors explicit remote NEXT_PUBLIC_WS_URL when defined", () => {
      (globalThis as any).window = {
        location: {
          protocol: "https:",
          host: "web.nexgentech.site",
          hostname: "web.nexgentech.site",
        },
      };
      process.env.NEXT_PUBLIC_WS_URL = "wss://api.nexgentech.site/ws";
      expect(getWsBaseUrl()).toBe("wss://api.nexgentech.site/ws");
    });

    it("protects remote HTTPS clients from mixed-content when NEXT_PUBLIC_WS_URL was left on localhost", () => {
      (globalThis as any).window = {
        location: {
          protocol: "https:",
          host: "web.nexgentech.site",
          hostname: "web.nexgentech.site",
        },
      };
      // Dev artifact left on localhost
      process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:3001/ws";
      // Must dynamically use secure domain endpoint to avoid browser mixed content block
      expect(getWsBaseUrl()).toBe("wss://web.nexgentech.site/ws");
    });

    it("returns relative API URL '' when accessed remotely without custom API domain", () => {
      (globalThis as any).window = {
        location: {
          protocol: "https:",
          host: "web.nexgentech.site",
          hostname: "web.nexgentech.site",
        },
      };
      delete process.env.NEXT_PUBLIC_API_URL;
      expect(getApiBaseUrl()).toBe("");
    });
  });
});
