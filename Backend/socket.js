import WebSocket, { WebSocketServer } from "ws";
import fetch from "node-fetch";

const PORT = 3020;
const API_URL = "https://train.madplay.site/api/sections/";
const RECOMMENDATIONS_API_URL = "https://train.madplay.site/api/sections/bpl";
const wss = new WebSocketServer({ port: PORT });
console.log(`🚆 WS server running on ws://localhost:${PORT}`);

let latestData = {}; // stores full section JSON from API
let latestRecommendations = []; // stores AI recommendations

// ============================================================
// Broadcast helper
// ============================================================
function broadcast(sectionId, fullData) {
  const msg = JSON.stringify({
    type: "section_update",
    sectionId,
    trains: fullData.trains || [],
    metadata: {
      id: fullData.section_id,
      name: fullData.section_name,
      coordinates: fullData.coordinates,
      upSection: fullData.upSection?.id || null,
      downSection: fullData.downSection?.id || null,
      tracks: fullData.track || []
    },
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.section === sectionId) {
      client.send(msg);
    }
  });
}

// ============================================================
// Broadcast recommendations helper
// ============================================================
function broadcastRecommendations(recommendations) {
  const msg = JSON.stringify({
    type: "recommendations_update",
    recommendations: recommendations || [],
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.subscribeRecommendations) {
      client.send(msg);
    }
  });
}

// ============================================================
// Fetch section → Store → Broadcast
// ============================================================
async function fetchSection(sectionId) {
  try {
    const res = await fetch(API_URL + sectionId);
    const json = await res.json();

    // ensure "trains" exist
    if (!Array.isArray(json.trains)) {
      json.trains = [];
    }

    latestData[sectionId] = json;

    broadcast(sectionId, json);
    console.log(`📡 Updated section: ${sectionId}`);
  } catch (err) {
    console.error("❌ Fetch error:", err.message);
  }
}

// ============================================================
// Fetch AI recommendations → Store → Broadcast
// ============================================================
async function fetchRecommendations(sectionId) {
  try {
    const res = await fetch(RECOMMENDATIONS_API_URL);
    const json = await res.json();
    // console.log(`🤖 Updated AI : ${JSON.stringify(json)}`);

    // Ensure "recommendations" exist
    const recommendations = json.trains || [];
    latestRecommendations = recommendations;

    broadcastRecommendations(recommendations);
    console.log(`🤖 Updated AI recommendations: ${recommendations.length} items`);
  } catch (err) {
    console.error("❌ Recommendations fetch error:", err.message);
  }
}

// ============================================================
// WS Connection: Subscribe → Instant Send Cached
// ============================================================
wss.on("connection", (socket) => {
  console.log("🟢 Client connected");

  socket.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "subscribe_section") {
        socket.section = data.sectionId;

        // If cached data exists → send instantly
        if (latestData[data.sectionId]) {
          broadcast(data.sectionId, latestData[data.sectionId]);
        }
      }

      if (data.type === "subscribe_recommendations") {
        socket.subscribeRecommendations = true;

        // If cached recommendations exist → send instantly
        if (latestRecommendations.length > 0) {
          broadcastRecommendations(latestRecommendations);
        }
      }
    } catch (err) {
      console.error("WS parse error:", err.message);
    }
  });

  socket.on("close", () => console.log("🔴 Client disconnected"));
});

// ============================================================
// Auto Poll All Active Sections & Recommendations
// ============================================================
setInterval(() => {
  const activeSections = new Set(
    [...wss.clients]
      .filter((c) => c.readyState === WebSocket.OPEN && c.section)
      .map((c) => c.section)
  );

  activeSections.forEach((sectionId) => fetchSection(sectionId));

  // Check if any client is subscribed to recommendations
  const hasRecommendationSubscribers = [...wss.clients].some(
    (c) => c.readyState === WebSocket.OPEN && c.subscribeRecommendations
  );

  if (hasRecommendationSubscribers) {
    fetchRecommendations();
  }
}, 10_000);
