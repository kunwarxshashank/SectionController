"use client";

import { useState, useEffect, useRef, useMemo } from "react";

const DEFAULT_SECTION_ID = (process.env.NEXT_PUBLIC_DEFAULT_SECTION_ID || "bpl").toLowerCase();
const SECTION_WS_URL = "ws://localhost:3020";

export function useSectionData(sectionId, initialData = null, enabled = true) {
  const [data, setData] = useState(initialData); // { trains, metadata }
  const [wsError, setWsError] = useState(null);
  const ws = useRef(null);

  const targetSectionId = useMemo(
    () => (sectionId || DEFAULT_SECTION_ID).toLowerCase(),
    [sectionId]
  );

  const shouldConnect = enabled ?? true;

  // ============================================================
  // 1. WebSocket realtime connection
  // ============================================================
  useEffect(() => {
    if (!shouldConnect || !targetSectionId) return;

    const socket = new WebSocket(SECTION_WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      setWsError(null);
      socket.send(
        JSON.stringify({
          type: "subscribe_section",
          sectionId: targetSectionId,
        })
      );
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const payloadSection = msg.sectionId?.toLowerCase();

      // WS FORMAT: { type, sectionId, trains, metadata, timestamp }
      if (msg.type === "section_update" && payloadSection === targetSectionId) {
        setData({
          trains: msg.trains || [],
          metadata: msg.metadata || {},
          source: "ws",
          updatedAt: msg.timestamp,
        });
      }
    };

    socket.onerror = () => setWsError("WS connection failed");
    socket.onclose = () => setWsError("WS disconnected");

    return () => socket.close();
  }, [targetSectionId, shouldConnect]);

  // ============================================================
  // 2. Fallback polling if WS fails
  // ============================================================
  useEffect(() => {
    if (!targetSectionId) return;
    if (!wsError && ws.current?.readyState === 1) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sections/${targetSectionId}`);
        const json = await res.json();

        setData({
          trains: json.trains || [],
          metadata: {
            id: json.section_id,
            name: json.section_name,
            coordinates: json.coordinates,
            upSection: json.upSection?.id || null,
            downSection: json.downSection?.id || null,
            tracks: json.track || [],
          },
          source: "fallback",
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.log("fallback fetch failed", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [wsError, targetSectionId]);

  return {
    data, // full section structure
    trains: data?.trains || [],
    metadata: data?.metadata || {},
    section: targetSectionId,
    wsError,
    isLoading: !data,
  };
}
