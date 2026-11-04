"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WS_BASE_URL, getWsBaseUrl, Ticket } from "./api";

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

  const lastSeenRef = useRef<number>(Date.now());
  const connectingStartedAtRef = useRef<number | null>(null);
  const isUnmountedRef = useRef(false);
  const callbackRef = useRef(onEvent);

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
  }, []);

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

    setIsConnecting(true);
    setStatus(reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting");

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
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        connectingStartedAtRef.current = null;

        if (isUnmountedRef.current || !salonId) return;

        reconnectAttemptsRef.current += 1;
        setReconnectAttempts(reconnectAttemptsRef.current);

        if (reconnectAttemptsRef.current >= 6) {
          setStatus("offline");
        } else {
          setStatus("reconnecting");
        }

        // Exponential backoff with jitter (1.2s to 5s max)
        if (!reconnectTimeoutRef.current) {
          const delay = Math.min(
            1200 * Math.pow(1.3, Math.min(reconnectAttemptsRef.current, 4)) + Math.random() * 300,
            5000
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, delay);
        }
      };
    } catch (e) {
      console.error("[WebSocket] Connection initialization failed:", e);
      setIsConnected(false);
      setIsConnecting(false);
      connectingStartedAtRef.current = null;

      reconnectAttemptsRef.current += 1;
      setReconnectAttempts(reconnectAttemptsRef.current);
      setStatus(reconnectAttemptsRef.current >= 6 ? "offline" : "reconnecting");

      if (!isUnmountedRef.current && salonId && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 2000);
      }
    }
  }, [salonId, send]);

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

      const ws = socketRef.current;
      const now = Date.now();

      // Case A: Socket is dead or closed, but no reconnect is scheduled
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        if (!reconnectTimeoutRef.current) {
          connect();
        }
        return;
      }

      // Case B: Stuck in CONNECTING state for > 10s (generous timeout for mobile & CF tunnels)
      if (ws.readyState === WebSocket.CONNECTING) {
        if (connectingStartedAtRef.current && now - connectingStartedAtRef.current > 10000) {
          console.warn("[WebSocket Watchdog] Connection handshake exceeded 10s, recovering...");
          connect();
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
  }, [salonId, connect, cleanupTimers]);

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
