"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WS_BASE_URL, getWsBaseUrl, Ticket } from "./api";

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
  const [lastPing, setLastPing] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
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
    if (!salonId || typeof window === "undefined" || isUnmountedRef.current) return;

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing socket if still active
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

    const wsUrl = `${getWsBaseUrl()}?salonId=${encodeURIComponent(salonId)}`;
    connectingStartedAtRef.current = Date.now();

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }
        setIsConnected(true);
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
        connectingStartedAtRef.current = null;

        // Auto-recover within <3 seconds (1.5s delay)
        if (!isUnmountedRef.current && salonId && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 1500);
        }
      };
    } catch (e) {
      console.error("[WebSocket] Connection initialization failed:", e);
      setIsConnected(false);
      connectingStartedAtRef.current = null;

      if (!isUnmountedRef.current && salonId && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 1500);
      }
    }
  }, [salonId, send]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    // 1. Automatic Heartbeat (Every 10 seconds, send ping)
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify({ type: "PING", timestamp: Date.now() }));
        } catch {}
      }
    }, 10000);

    // 2. Reconnect Watchdog (<3s auto-recovery check every 1.5 seconds)
    watchdogIntervalRef.current = setInterval(() => {
      if (isUnmountedRef.current || !salonId) return;

      const ws = socketRef.current;
      const now = Date.now();

      // Case A: Socket is dead or closed, but no reconnect is scheduled -> trigger immediately
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        if (!reconnectTimeoutRef.current) {
          connect();
        }
        return;
      }

      // Case B: Stuck in CONNECTING state for > 2.5s -> terminate and retry
      if (ws.readyState === WebSocket.CONNECTING) {
        if (connectingStartedAtRef.current && now - connectingStartedAtRef.current > 2500) {
          console.warn("[WebSocket Watchdog] Connection attempt stalled, forcing reconnect...");
          connect();
        }
        return;
      }

      // Case C: Socket is OPEN but has been completely silent with no traffic for > 30 seconds
      if (ws.readyState === WebSocket.OPEN && now - lastSeenRef.current > 30000) {
        console.warn("[WebSocket Watchdog] Stale silent connection detected (>30s), auto-recovering...");
        try {
          ws.close();
        } catch {}
        connect();
      }
    }, 1500);

    return () => {
      isUnmountedRef.current = true;
      cleanupTimers();

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

  return { isConnected, reconnect: connect, send, lastPing };
}
