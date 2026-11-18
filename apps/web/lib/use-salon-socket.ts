"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WS_BASE_URL, getWsBaseUrl } from "./api";
import type { Ticket } from "./api";
export type ConnectionStatus = "connected" | "connecting" | "reconnecting" | "offline";

export interface QueueSocketEvent {
  type:
    | "TICKET_CREATED"
    | "TICKET_SUMMONED"
    | "TICKET_CALLED"
    | "TICKET_SEATED"
    | "CUSTOMER_SEATED"
    | "TICKET_COMPLETED"
    | "TICKET_SOFT_BUMPED"
    | "TICKET_BUMPED"
    | "TICKET_CANCELLED"
    | "QUEUE_UPDATED"
    | "QUEUE_RECALCULATED"
    | "EMERGENCY_HALT"
    | "PONG"
    | "HEARTBEAT_ACK";
  ticket?: Ticket;
  timestamp?: number | string;
  message?: string;
  salonId?: string;
}

export function useSalonSocket(
  salonId: string | null | undefined,
  onEvent?: (event: QueueSocketEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>(() => (salonId ? "connecting" : "offline"));
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastPing, setLastPing] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const activeSalonIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const lastSeenRef = useRef<number>(Date.now());
  const connectingStartedAtRef = useRef<number | null>(null);
  const isUnmountedRef = useRef(false);
  const callbackRef = useRef(onEvent);
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  const cleanupTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (watchdogIntervalRef.current) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const activateFallback = useCallback(() => {
    if (isUnmountedRef.current || !salonId) return;

    setIsConnected(true);
    setIsConnecting(false);
    setStatus("connected");

    if (socketRef.current) {
      try {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        socketRef.current.onopen = null;
        socketRef.current.close();
      } catch {}
      socketRef.current = null;
    }

    if (!pollingIntervalRef.current) {
      console.log("[WebSocket Fallback] Switching to resilient HTTP polling sync (4s interval)");
      if (callbackRef.current && !isUnmountedRef.current) {
        callbackRef.current({ type: "QUEUE_UPDATED", salonId });
      }
      pollingIntervalRef.current = setInterval(() => {
        if (callbackRef.current && !isUnmountedRef.current) {
          callbackRef.current({ type: "QUEUE_UPDATED", salonId });
        }
      }, 4000);
    }

    // Gentle background probe every 30s to restore WebSocket if route is added
    if (!reconnectTimeoutRef.current) {
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        if (!isUnmountedRef.current && (typeof navigator === "undefined" || navigator.onLine)) {
          connectRef.current();
        }
      }, 30000);
    }
  }, [salonId]);

  const send = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        socketRef.current.send(payload);
        lastSeenRef.current = Date.now();
        return true;
      } catch (err) {
        console.warn("[WebSocket] Send failed:", err);
        return false;
      }
    }
    return false;
  }, []);

  const connect = useCallback(() => {
    if (!salonId || typeof window === "undefined" || isUnmountedRef.current) {
      setStatus("offline");
      setIsConnected(false);
      setIsConnecting(false);
      return;
    }

    // Check device online status
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      setIsConnected(false);
      setIsConnecting(false);
      return;
    }

    // If socket is already open for this exact salonId, keep it
    if (
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN &&
      activeSalonIdRef.current === salonId
    ) {
      setIsConnected(true);
      setIsConnecting(false);
      setStatus("connected");
      return;
    }

    // Clear any pending reconnect timer
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close previous socket safely
    if (socketRef.current) {
      try {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        socketRef.current.onopen = null;
        socketRef.current.close();
      } catch {}
      socketRef.current = null;
    }

    const isBackgroundProbe = pollingIntervalRef.current !== null;
    if (!isBackgroundProbe) {
      setIsConnecting(true);
      setStatus(reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting");
    }

    const wsUrl = `${getWsBaseUrl()}?salonId=${encodeURIComponent(salonId)}`;
    connectingStartedAtRef.current = Date.now();
    activeSalonIdRef.current = salonId;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsConnected(true);
        setIsConnecting(false);
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);
        connectingStartedAtRef.current = null;
        lastSeenRef.current = Date.now();

        // Send subscribe and join room payload
        send({ type: "JOIN_SALON", salonId, action: "subscribe" });
      };

      ws.onmessage = (event) => {
        lastSeenRef.current = Date.now();
        try {
          const raw = event.data;
          const data = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (data && (data.type === "PONG" || data.type === "HEARTBEAT_ACK")) {
            setLastPing(Date.now());
            return;
          }
          if (callbackRef.current && data) {
            callbackRef.current(data);
          }
        } catch {
          // Non-JSON message or raw ping/pong response
          setLastPing(Date.now());
        }
      };

      ws.onerror = (err) => {
        console.warn("[WebSocket] Error occurred:", err);
        activateFallback();
      };

      ws.onclose = () => {
        connectingStartedAtRef.current = null;

        if (isUnmountedRef.current || !salonId) return;

        reconnectAttemptsRef.current += 1;
        setReconnectAttempts(reconnectAttemptsRef.current);

        // If WebSockets cannot connect (e.g. reverse proxy / Cloudflare Tunnel only forwards HTTP),
        // activate smooth HTTP polling fallback so the page never loops or hangs in a reconnect state.
        activateFallback();
      };
    } catch (e) {
      console.error("[WebSocket] Connection initialization failed:", e);
      connectingStartedAtRef.current = null;

      reconnectAttemptsRef.current += 1;
      setReconnectAttempts(reconnectAttemptsRef.current);

      activateFallback();
    }
  }, [salonId, send, activateFallback]);

  connectRef.current = connect;

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    // 1. Automatic Heartbeat (Every 12 seconds, ping server)
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify({ type: "PING", timestamp: Date.now() }));
        } catch {}
      }
    }, 12000);

    // 2. Resilient Watchdog (Check every 2.5 seconds, generous 10s handshake threshold)
    watchdogIntervalRef.current = setInterval(() => {
      if (isUnmountedRef.current || !salonId) return;

      // Don't hammer reconnect if polling fallback is active
      if (pollingIntervalRef.current) return;

      const ws = socketRef.current;
      const now = Date.now();

      // Case A: Socket is dead or closed, but no reconnect is scheduled
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        if (!reconnectTimeoutRef.current) {
          activateFallback();
        }
        return;
      }

      // Case B: Stuck in CONNECTING state for > 3.5s (proxy/tunnel does not support WS upgrade)
      if (ws.readyState === WebSocket.CONNECTING) {
        if (connectingStartedAtRef.current && now - connectingStartedAtRef.current > 3500) {
          console.warn("[WebSocket Watchdog] Handshake timed out (>3.5s), switching to HTTP polling fallback");
          activateFallback();
        }
        return;
      }

      // Case C: Silent connection with no traffic for > 45s
      if (ws.readyState === WebSocket.OPEN && now - lastSeenRef.current > 45000) {
        console.warn("[WebSocket Watchdog] Idle silence detected (>45s), probing connection...");
        try {
          ws.send(JSON.stringify({ type: "PING", timestamp: now }));
        } catch {}
      }
    }, 2500);

    // 3. Tab Visibility & Device Network Listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const ws = socketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          connect();
        } else {
          try {
            ws.send(JSON.stringify({ type: "PING", timestamp: Date.now() }));
          } catch {}
        }
      }
    };

    const handleOnline = () => {
      console.log("[WebSocket] Network restored (online event)");
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      connect();
    };

    const handleOffline = () => {
      console.log("[WebSocket] Network lost (offline event)");
      setStatus("offline");
      setIsConnected(false);
      setIsConnecting(false);
    };

    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      isUnmountedRef.current = true;
      cleanupTimers();

      if (typeof window !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }

      if (socketRef.current) {
        try {
          socketRef.current.onclose = null;
          socketRef.current.onerror = null;
          socketRef.current.onmessage = null;
          socketRef.current.onopen = null;
          socketRef.current.close();
        } catch {}
        socketRef.current = null;
      }
    };
  }, [salonId, connect, activateFallback, cleanupTimers]);

  return {
    isConnected,
    isConnecting,
    status,
    reconnectAttempts,
    reconnect: connect,
    send,
    lastPing,
  };
}
