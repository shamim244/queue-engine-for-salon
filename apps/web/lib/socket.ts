"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WS_BASE_URL, Ticket } from "./api";

export interface QueueSocketEvent {
  type:
    | "TICKET_CREATED"
    | "TICKET_CALLED"
    | "CUSTOMER_SEATED"
    | "TICKET_COMPLETED"
    | "TICKET_BUMPED"
    | "QUEUE_UPDATED"
    | "EMERGENCY_HALT";
  ticket?: Ticket;
  timestamp?: number;
  message?: string;
  salonId?: string;
}

export function useSalonSocket(
  salonId: string | null | undefined,
  onEvent?: (event: QueueSocketEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!salonId || typeof window === "undefined") return;

    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {}
    }

    const wsUrl = `${WS_BASE_URL}?salonId=${encodeURIComponent(salonId)}`;
    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Send join payload as well to ensure room assignment
        ws.send(JSON.stringify({ type: "JOIN_SALON", salonId }));
      };

      ws.onmessage = (event) => {
        try {
          const data: QueueSocketEvent = JSON.parse(event.data);
          if (callbackRef.current) {
            callbackRef.current(data);
          }
        } catch (err) {
          console.error("[WebSocket] Parse error:", err);
        }
      };

      ws.onerror = (err) => {
        console.warn("[WebSocket] Error:", err);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (e) {
      console.error("[WebSocket] Connection attempt failed:", e);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    }
  }, [salonId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, reconnect: connect };
}
