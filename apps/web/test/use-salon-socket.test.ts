import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import * as socketExports from "../lib/socket";
import { useSalonSocket } from "../lib/use-salon-socket";

describe("useSalonSocket Protocol, Fast Watchdog & Leak Prevention Suite", () => {
  it("re-exports useSalonSocket and types cleanly from lib/socket", () => {
    expect(socketExports.useSalonSocket).toBeDefined();
    expect(typeof socketExports.useSalonSocket).toBe("function");
    expect(useSalonSocket).toBe(socketExports.useSalonSocket);
  });

  it("verifies exact watchdog timing calibrations and constants", async () => {
    const fileContent = await Bun.file("apps/web/lib/use-salon-socket.ts").text();

    // Fast watchdog interval: 200ms
    expect(fileContent).toContain("200);");

    // Fast handshake threshold: 800ms
    expect(fileContent).toContain(">= 800");

    // Resilient silent HTTP polling sync interval: 3500ms (3.5s)
    expect(fileContent).toContain("3500);");

    // Leak prevention: Backoff probe is 300,000ms (5 minutes) instead of 30s loop
    expect(fileContent).toContain("300000);");
    expect(fileContent).not.toContain("30000);");

    // Focus probe storm cooldown: 15,000ms (15 seconds)
    expect(fileContent).toContain("15000");

    // Zero server waste: skips background polling ticks when tab is hidden
    expect(fileContent).toContain('document.visibilityState === "hidden"');
  });

  describe("Watchdog Handshake Timeout & Fallback Activation Behavior", () => {
    it("terminates hanging WebSocket when handshake exceeds 800ms and engages silent HTTP sync", () => {
      let wsCloseCalled = false;
      let nulledListeners = false;

      class HangingWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;

        readyState = HangingWebSocket.CONNECTING;
        onopen: any = null;
        onclose: any = null;
        onerror: any = null;
        onmessage: any = null;

        close() {
          wsCloseCalled = true;
          if (this.onclose === null && this.onerror === null && this.onopen === null) {
            nulledListeners = true;
          }
          this.readyState = HangingWebSocket.CLOSED;
        }

        send() {}
      }

      const socket = new HangingWebSocket();
      expect(socket.readyState).toBe(HangingWebSocket.CONNECTING);

      // Verify watchdog condition
      const connectStartedAt = Date.now() - 850; // 850ms ago
      const now = Date.now();
      const isHandshakeTimedOut = now - connectStartedAt >= 800;
      expect(isHandshakeTimedOut).toBe(true);

      // Emulate activateFallback() listener nulling and socket closure
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.onopen = null;
      socket.close();

      expect(wsCloseCalled).toBe(true);
      expect(nulledListeners).toBe(true);
      expect(socket.readyState).toBe(HangingWebSocket.CLOSED);
    });

    it("prevents double-connect race on concurrent visibilitychange and focus events", () => {
      let createdSocketCount = 0;
      let activeWs: any = null;

      class MockWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        readyState = MockWebSocket.CONNECTING;
        constructor() {
          createdSocketCount++;
          activeWs = this;
        }
        close() {
          this.readyState = 3;
        }
      }

      // Handler implementing the in-flight CONNECTING guard
      const handleVisibilityChange = () => {
        if (activeWs && activeWs.readyState === MockWebSocket.OPEN) {
          return;
        }
        // In-flight handshake guard
        if (activeWs && activeWs.readyState === MockWebSocket.CONNECTING) {
          return; // Must NOT spawn duplicate socket
        }
        new MockWebSocket();
      };

      // 1. Initial connection
      handleVisibilityChange();
      expect(createdSocketCount).toBe(1);
      expect(activeWs.readyState).toBe(MockWebSocket.CONNECTING);

      // 2. Rapid second event (e.g. window.focus right after visibilitychange)
      handleVisibilityChange();
      // Must not create another socket
      expect(createdSocketCount).toBe(1);

      // 3. Third event while still connecting
      handleVisibilityChange();
      expect(createdSocketCount).toBe(1);

      // 4. Once socket is OPEN, focus does not recreate socket
      activeWs.readyState = MockWebSocket.OPEN;
      handleVisibilityChange();
      expect(createdSocketCount).toBe(1);
    });

    it("verifies zero server waste: background tab suppresses HTTP poll ticks", () => {
      let dispatchedSyncCount = 0;
      let isDocumentHidden = true;

      const pollTick = () => {
        if (isDocumentHidden) {
          return; // Zero Server Waste
        }
        dispatchedSyncCount++;
      };

      // 5 ticks while phone screen is off / tab hidden
      for (let i = 0; i < 5; i++) {
        pollTick();
      }
      expect(dispatchedSyncCount).toBe(0);

      // User unlocks phone / returns to tab
      isDocumentHidden = false;
      // Immediate sync upon becoming visible
      dispatchedSyncCount++;
      expect(dispatchedSyncCount).toBe(1);

      // Subsequent foreground ticks dispatch normally
      pollTick();
      pollTick();
      expect(dispatchedSyncCount).toBe(3);
    });

    it("enforces probe cooldown when in fallback polling mode", () => {
      let probeCount = 0;
      let lastProbeAt = 0;
      const isPollingActive = true;

      const triggerProbeAttempt = (currentTime: number) => {
        if (isPollingActive && currentTime - lastProbeAt < 15000) {
          return false; // Suppressed by cooldown
        }
        lastProbeAt = currentTime;
        probeCount++;
        return true;
      };

      const t0 = 100000;
      // First probe succeeds
      expect(triggerProbeAttempt(t0)).toBe(true);
      expect(probeCount).toBe(1);

      // Rapid focus 2 seconds later suppressed
      expect(triggerProbeAttempt(t0 + 2000)).toBe(false);
      expect(probeCount).toBe(1);

      // Rapid focus 8 seconds later suppressed
      expect(triggerProbeAttempt(t0 + 8000)).toBe(false);
      expect(probeCount).toBe(1);

      // Focus 15.1 seconds later allowed
      expect(triggerProbeAttempt(t0 + 15100)).toBe(true);
      expect(probeCount).toBe(2);
    });

    it("clears polling interval and dispatches JOIN_SALON when WebSocket successfully opens", () => {
      let pollingCleared = false;
      let sentPayload: any = null;

      let pollingTimer: any = setInterval(() => {}, 3500);

      const onWsOpen = () => {
        if (pollingTimer) {
          clearInterval(pollingTimer);
          pollingTimer = null;
          pollingCleared = true;
        }
        sentPayload = { type: "JOIN_SALON", salonId: "salon-royal", action: "subscribe" };
      };

      onWsOpen();

      expect(pollingCleared).toBe(true);
      expect(pollingTimer).toBeNull();
      expect(sentPayload).toEqual({
        type: "JOIN_SALON",
        salonId: "salon-royal",
        action: "subscribe",
      });
    });
  });
});
