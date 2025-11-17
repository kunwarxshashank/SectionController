import { useEffect, useState } from "react";

export default function IstClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,              // ✅ ensures AM/PM format
        timeZone: "Asia/Kolkata",
      }).format(now);
      setTime(formatted);
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);


  return (
    <div
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "8px",
        background: "#fff",
        boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: "600" }}>Time: {time}</div>
    </div>
  );
}
