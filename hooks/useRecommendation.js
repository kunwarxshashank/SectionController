"use client";

import { useState, useEffect, useRef } from "react";

const RECOMMENDATIONS_WS_URL = "ws://localhost:3020";

export function useRecommendation() {
  const [recommendations, setRecommendations] = useState([]);
  const [wsError, setWsError] = useState(null);
  const ws = useRef(null);

  // ============================================================
  // 1. WebSocket realtime connection
  // ============================================================
  useEffect(() => {
    const socket = new WebSocket(RECOMMENDATIONS_WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      setWsError(null);
      socket.send(
        JSON.stringify({
          type: "subscribe_recommendations",
        })
      );
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      // WS FORMAT: { type: "recommendations_update", recommendations: [...], timestamp }
      if (msg.type === "recommendations_update") {
        setRecommendations(msg.recommendations || []);
      }
    };

    socket.onerror = () => setWsError("WS connection failed");
    socket.onclose = () => setWsError("WS disconnected");

    return () => socket.close();
  }, []);

  // ============================================================
  // 2. Fallback polling if WS fails
  // ============================================================
  useEffect(() => {
    if (!wsError && ws.current?.readyState === 1) return; // WS OK → no fallback

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/recommendations`);
        const json = await res.json();

        setRecommendations(json.recommendations || []);
      } catch (err) {
        console.log("fallback fetch failed", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [wsError]);

  return {
    recommendations,
    wsError,
    isLoading: recommendations.length === 0 && !wsError,
  };
}
