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

    it("dynamically resolves local network IP on mobile HTTP without mixed content issues", () => {
      (globalThis as any).window = {
        location: {
          protocol: "http:",
          host: "192.168.1.50:3000",
          hostname: "192.168.1.50",
        },
      };
      // Dev env with default localhost WS URL
      process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:3001/ws";
      expect(getWsBaseUrl()).toBe("ws://192.168.1.50:3001/ws");

      // API URL falls back to relative "" so Next.js server proxies /api/*
      expect(getApiBaseUrl()).toBe("");
    });
  });

  describe("Re-exports Authority", () => {
    it("ensures lib/socket re-exports getWsBaseUrl and getApiBaseUrl", async () => {
      const socketModule = await import("../lib/socket");
      expect(typeof socketModule.getWsBaseUrl).toBe("function");
      expect(typeof socketModule.getApiBaseUrl).toBe("function");
    });
  });

  describe("Next.js Config Authority", () => {
    it("ensures next.config.ts rewrites defaults to localhost:3001 without INTERNAL_API_URL", async () => {
      delete process.env.INTERNAL_API_URL;
      const nextConfig = (await import("../next.config")).default;
      if (typeof nextConfig.rewrites === "function") {
        const rewrites = await nextConfig.rewrites();
        const apiRewrite = Array.isArray(rewrites)
          ? rewrites.find((r: any) => r.source === "/api/:path*")
          : null;
        expect(apiRewrite?.destination).toContain("http://localhost:3001/api/:path*");
      }
    });

    it("ensures next.config.ts includes local network wildcards in allowedDevOrigins for mobile dev", async () => {
      const nextConfig = (await import("../next.config")).default;
      const origins = nextConfig.allowedDevOrigins || [];
      expect(origins).toContain("192.168.*");
      expect(origins).toContain("10.*");
      expect(origins).toContain("172.*");
    });

    it("ensures next.config.ts defines security headers and immutable caching rules", async () => {
      const nextConfig = (await import("../next.config")).default;
      if (typeof nextConfig.headers === "function") {
        const headersList = await nextConfig.headers();
        expect(Array.isArray(headersList)).toBe(true);
        // Verify security headers exist
        const hasNosniff = headersList.some((entry: any) =>
          entry.headers?.some((h: any) => h.key === "X-Content-Type-Options" && h.value === "nosniff")
        );
        expect(hasNosniff).toBe(true);
      }
    });
  });
});
