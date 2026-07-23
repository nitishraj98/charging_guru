"use client";
import { useEffect, useRef } from "react";

// Reuses the existing backend WS hub (api/ws/hub.py) as-is — it's a generic
// relay of anything published to chan:station:{id}, so no backend changes
// were needed to add new event types flowing through it.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const WS_BASE = BASE.replace(/^http/, "ws");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStationSocket(stationId: string | undefined, onMessage: (msg: any) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!stationId) return;
    const ws = new WebSocket(`${WS_BASE}/ws/stations/${stationId}`);

    ws.onmessage = (ev) => {
      try {
        onMessageRef.current(JSON.parse(ev.data));
      } catch {
        // malformed frame — ignore, the poll fallback covers correctness
      }
    };
    ws.onerror = () => { /* swallow — poll fallback covers this */ };

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 25_000);

    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, [stationId]);
}
