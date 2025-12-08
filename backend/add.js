import mongoose from "mongoose";

import Tracks from "./models/trackSchema.js";
import Section from "./models/sectionSchema.js";
import Station from "./models/stationSchema.js";
import Node from "./models/nodeSchema.js";
import Edge from "./models/edgeSchema.js";

await mongoose.connect("mongodb://127.0.0.1:27017/railway_sim");
console.log("Connected to DB");

// -----------------------------
// HELPERS
// -----------------------------
function createNode(id, type, x, y, line, boundary = false) {
  return {
    nodeId: id,
    nodeType: type,
    x,
    y,
    line,
    signalColor: "green",
    signalType: "home",
    blockBoundary: boundary
  };
}

function createEdge(id, start, end, type, dir, length, stationCode = "", loopGroup = "", loopNumber = 0) {
  return {
    edgeId: id,
    startNode: start,
    endNode: end,
    edgeType: type,
    stream: dir.toLowerCase(),
    direction: dir,
    isOccupied: false,
    maxspeed: type === "loop" ? "30" : "120",
    length,
    stationCode,
    loopGroup,
    loopNumber
  };
}

// --------------------------------------
// GEOMETRY DEFINITION
// --------------------------------------
const Y = {
  DOWN: 400,
  MAIN: 500,
  UP: 600,
  UP_LOOP1: 700,
  UP_LOOP2: 800,
  UP_LOOP3: 900,
  DOWN_LOOP1: 300,
  DOWN_LOOP2: 200,
  DOWN_LOOP3: 100
};

// X positions for key points
const X = {
  START: 0,
  ST_A_START: 10,
  ST_A_END: 12,
  ST_B_START: 32,
  ST_B_END: 34,
  ST_C_START: 50,
  ST_C_END: 52
};

// Automatic signalling block sections between B and C
const AUTO_SIGNAL_POINTS = [34, 40, 45, 50];

// Station configs with names
const STATIONS = {
  A: { start: X.ST_A_START, end: X.ST_A_END, loopCount: 2, code: "BPL", name: "Bhopal", id: "bhopal" },
  B: { start: X.ST_B_START, end: X.ST_B_END, loopCount: 2, code: "VDA", name: "Vidisha", id: "vidisha" },
  C: { start: X.ST_C_START, end: X.ST_C_END, loopCount: 3, code: "BINA", name: "Bina", id: "bina" }
};

// --------------------------------------
// MAIN SCRIPT
// --------------------------------------
async function generate() {
  // RESET DB
  await Node.deleteMany({});
  await Edge.deleteMany({});
  await Tracks.deleteMany({});
  await Section.deleteMany({});
  await Station.deleteMany({});
  console.log("🗑️ Cleared old data!");

  // CREATE SECTION - section_id matches admin's sectionId for login
  const section = await Section.create({
    section_id: "bplbina",
    name: "Bhopal - Bina Section"
  });

  // We will store nodes and edges for each track separately
  const upNodes = [];
  const upEdges = [];

  const mainNodes = [];
  const mainEdges = [];

  const downNodes = [];
  const downEdges = [];

  // Main track X positions (key points along the track)
  const mainTrackX = [X.START, X.ST_A_START, X.ST_A_END, X.ST_B_START, X.ST_B_END, X.ST_C_START, X.ST_C_END];

  // ================================================
  // 1) CREATE MAIN TRACK NODES FOR UP, MAIN, DOWN
  // ================================================
  console.log("📍 Creating main track nodes...");

  mainTrackX.forEach((x, i) => {
    const idx = i + 1;
    
    // UP track nodes (y = 600)
    upNodes.push(createNode(`UP_N${idx}`, "main", x, Y.UP, "UP"));
    
    // MAIN track nodes (y = 500) - bidirectional
    mainNodes.push(createNode(`MAIN_N${idx}`, "main", x, Y.MAIN, "MAIN"));
    
    // DOWN track nodes (y = 400)
    downNodes.push(createNode(`DOWN_N${idx}`, "main", x, Y.DOWN, "DOWN"));
  });

  // ================================================
  // 2) CREATE MAIN TRACK EDGES
  // ================================================
  console.log("🔗 Creating main track edges...");

  // Edge from x=0 to x=10 (before station A)
  upEdges.push(createEdge("UP_E1", "UP_N1", "UP_N2", "block", "UP", 10));
  mainEdges.push(createEdge("MAIN_E1", "MAIN_N1", "MAIN_N2", "block", "BOTH", 10));
  downEdges.push(createEdge("DOWN_E1", "DOWN_N1", "DOWN_N2", "block", "DOWN", 10));

  // Edge from x=10 to x=12 (Station A area - platform edges)
  upEdges.push(createEdge("UP_E2", "UP_N2", "UP_N3", "block", "UP", 2, "BPL"));
  mainEdges.push(createEdge("MAIN_E2", "MAIN_N2", "MAIN_N3", "block", "BOTH", 2, "BPL"));
  downEdges.push(createEdge("DOWN_E2", "DOWN_N2", "DOWN_N3", "block", "DOWN", 2, "BPL"));

  // Edge from x=12 to x=32 (Block section between A and B)
  upEdges.push(createEdge("UP_E3", "UP_N3", "UP_N4", "block", "UP", 20));
  mainEdges.push(createEdge("MAIN_E3", "MAIN_N3", "MAIN_N4", "block", "BOTH", 20));
  downEdges.push(createEdge("DOWN_E3", "DOWN_N3", "DOWN_N4", "block", "DOWN", 20));

  // Edge from x=32 to x=34 (Station B area - platform edges)
  upEdges.push(createEdge("UP_E4", "UP_N4", "UP_N5", "block", "UP", 2, "VDA"));
  mainEdges.push(createEdge("MAIN_E4", "MAIN_N4", "MAIN_N5", "block", "BOTH", 2, "VDA"));
  downEdges.push(createEdge("DOWN_E4", "DOWN_N4", "DOWN_N5", "block", "DOWN", 2, "VDA"));

  // Edge from x=50 to x=52 (Station C area - platform edges)
  upEdges.push(createEdge("UP_E_STC", "UP_N6", "UP_N7", "block", "UP", 2, "BINA"));
  mainEdges.push(createEdge("MAIN_E_STC", "MAIN_N6", "MAIN_N7", "block", "BOTH", 2, "BINA"));
  downEdges.push(createEdge("DOWN_E_STC", "DOWN_N6", "DOWN_N7", "block", "DOWN", 2, "BINA"));

  // ================================================
  // 3) AUTOMATIC SIGNALLING SECTION (x=34 to x=50)
  // ================================================
  console.log("🚦 Creating automatic signalling section...");

  // Create intermediate nodes for automatic signalling
  for (let i = 0; i < AUTO_SIGNAL_POINTS.length - 1; i++) {
    const startX = AUTO_SIGNAL_POINTS[i];
    const endX = AUTO_SIGNAL_POINTS[i + 1];
    const length = endX - startX;

    // For first segment, use existing N5 nodes as start
    // For others, create intermediate auto nodes
    if (i > 0) {
      upNodes.push(createNode(`UP_AUTO${i}`, "main", startX, Y.UP, "UP", true));
      mainNodes.push(createNode(`MAIN_AUTO${i}`, "main", startX, Y.MAIN, "MAIN", true));
      downNodes.push(createNode(`DOWN_AUTO${i}`, "main", startX, Y.DOWN, "DOWN", true));
    }

    const startNodeUp = i === 0 ? "UP_N5" : `UP_AUTO${i}`;
    const endNodeUp = i === AUTO_SIGNAL_POINTS.length - 2 ? "UP_N6" : `UP_AUTO${i + 1}`;

    const startNodeMain = i === 0 ? "MAIN_N5" : `MAIN_AUTO${i}`;
    const endNodeMain = i === AUTO_SIGNAL_POINTS.length - 2 ? "MAIN_N6" : `MAIN_AUTO${i + 1}`;

    const startNodeDown = i === 0 ? "DOWN_N5" : `DOWN_AUTO${i}`;
    const endNodeDown = i === AUTO_SIGNAL_POINTS.length - 2 ? "DOWN_N6" : `DOWN_AUTO${i + 1}`;

    upEdges.push(createEdge(`UP_AUTO_E${i + 1}`, startNodeUp, endNodeUp, "automatic", "UP", length));
    mainEdges.push(createEdge(`MAIN_AUTO_E${i + 1}`, startNodeMain, endNodeMain, "automatic", "BOTH", length));
    downEdges.push(createEdge(`DOWN_AUTO_E${i + 1}`, startNodeDown, endNodeDown, "automatic", "DOWN", length));
  }

  // ================================================
  // 4) STATION LOOPS
  // ================================================
  console.log("🔄 Creating station loops...");

  // Helper to create loop nodes and edges for a station
  function createStationLoops(station, stationKey) {
    const { start, end, loopCount, code } = station;

    for (let i = 1; i <= loopCount; i++) {
      // UP LOOPS (y = 700, 800, 900...)
      const upLoopY = Y.UP_LOOP1 + (i - 1) * 100;
      const upLoopStartNode = `UP_${stationKey}_L${i}_START`;
      const upLoopEndNode = `UP_${stationKey}_L${i}_END`;
      
      upNodes.push(createNode(upLoopStartNode, "loop", start, upLoopY, "UP_LOOP"));
      upNodes.push(createNode(upLoopEndNode, "loop", end, upLoopY, "UP_LOOP"));
      upEdges.push(createEdge(
        `UP_${stationKey}_LOOP${i}`,
        upLoopStartNode,
        upLoopEndNode,
        "loop",
        "UP",
        end - start,
        code,
        stationKey,
        i
      ));

      // DOWN LOOPS (y = 300, 200, 100...)
      const downLoopY = Y.DOWN_LOOP1 - (i - 1) * 100;
      const downLoopStartNode = `DOWN_${stationKey}_L${i}_START`;
      const downLoopEndNode = `DOWN_${stationKey}_L${i}_END`;
      
      downNodes.push(createNode(downLoopStartNode, "loop", start, downLoopY, "DOWN_LOOP"));
      downNodes.push(createNode(downLoopEndNode, "loop", end, downLoopY, "DOWN_LOOP"));
      downEdges.push(createEdge(
        `DOWN_${stationKey}_LOOP${i}`,
        downLoopStartNode,
        downLoopEndNode,
        "loop",
        "DOWN",
        end - start,
        code,
        stationKey,
        i
      ));

      // CROSSING edges to connect main track to loops
      const mainNodeAtStart = stationKey === "A" ? "MAIN_N2" : 
                              stationKey === "B" ? "MAIN_N4" : "MAIN_N6";
      
      upEdges.push(createEdge(
        `UP_${stationKey}_CROSS_IN_L${i}`,
        mainNodeAtStart,
        upLoopStartNode,
        "crossing",
        "UP",
        Math.abs(upLoopY - Y.MAIN),
        code
      ));
      
      downEdges.push(createEdge(
        `DOWN_${stationKey}_CROSS_IN_L${i}`,
        mainNodeAtStart,
        downLoopStartNode,
        "crossing",
        "DOWN",
        Math.abs(Y.MAIN - downLoopY),
        code
      ));

      // Connect from loop end back to main track
      const mainNodeAtEnd = stationKey === "A" ? "MAIN_N3" : 
                            stationKey === "B" ? "MAIN_N5" : "MAIN_N7";
      
      upEdges.push(createEdge(
        `UP_${stationKey}_CROSS_OUT_L${i}`,
        upLoopEndNode,
        mainNodeAtEnd,
        "crossing",
        "UP",
        Math.abs(upLoopY - Y.MAIN),
        code
      ));

      downEdges.push(createEdge(
        `DOWN_${stationKey}_CROSS_OUT_L${i}`,
        downLoopEndNode,
        mainNodeAtEnd,
        "crossing",
        "DOWN",
        Math.abs(Y.MAIN - downLoopY),
        code
      ));
    }
  }

  // Create loops for all stations
  createStationLoops(STATIONS.A, "A");
  createStationLoops(STATIONS.B, "B");
  createStationLoops(STATIONS.C, "C");

  // ================================================
  // 5) SAVE TO DATABASE
  // ================================================
  console.log("💾 Saving to database...");

  // Insert all nodes
  const savedUpNodes = await Node.insertMany(upNodes);
  const savedMainNodes = await Node.insertMany(mainNodes);
  const savedDownNodes = await Node.insertMany(downNodes);

  console.log(`   ✅ UP Nodes: ${savedUpNodes.length}`);
  console.log(`   ✅ MAIN Nodes: ${savedMainNodes.length}`);
  console.log(`   ✅ DOWN Nodes: ${savedDownNodes.length}`);

  // Insert all edges
  const savedUpEdges = await Edge.insertMany(upEdges);
  const savedMainEdges = await Edge.insertMany(mainEdges);
  const savedDownEdges = await Edge.insertMany(downEdges);

  console.log(`   ✅ UP Edges: ${savedUpEdges.length}`);
  console.log(`   ✅ MAIN Edges: ${savedMainEdges.length}`);
  console.log(`   ✅ DOWN Edges: ${savedDownEdges.length}`);

  // Create THREE separate Track documents
  const upTrack = await Tracks.create({
    sectionId: section._id,
    nodes: savedUpNodes.map(n => n._id),
    edges: savedUpEdges.map(e => e._id)
  });

  const mainTrack = await Tracks.create({
    sectionId: section._id,
    nodes: savedMainNodes.map(n => n._id),
    edges: savedMainEdges.map(e => e._id)
  });

  const downTrack = await Tracks.create({
    sectionId: section._id,
    nodes: savedDownNodes.map(n => n._id),
    edges: savedDownEdges.map(e => e._id)
  });

  console.log("   ✅ Created 3 Track documents (UP, MAIN, DOWN)");

  // ================================================
  // 6) CREATE STATIONS
  // ================================================
  console.log("🚉 Creating stations...");

  // Helper to find saved node by nodeId
  const findNodeByNodeId = (nodeId) => {
    const allSavedNodes = [...savedUpNodes, ...savedMainNodes, ...savedDownNodes];
    return allSavedNodes.find(n => n.nodeId === nodeId);
  };

  // Create stations with references to MAIN track start/end nodes
  const stationBhopal = await Station.create({
    stationId: STATIONS.A.id,
    stationName: STATIONS.A.name,
    sectionId: section._id,
    startNode: findNodeByNodeId("MAIN_N2")?._id,
    endNode: findNodeByNodeId("MAIN_N3")?._id
  });

  const stationVidisha = await Station.create({
    stationId: STATIONS.B.id,
    stationName: STATIONS.B.name,
    sectionId: section._id,
    startNode: findNodeByNodeId("MAIN_N4")?._id,
    endNode: findNodeByNodeId("MAIN_N5")?._id
  });

  const stationBina = await Station.create({
    stationId: STATIONS.C.id,
    stationName: STATIONS.C.name,
    sectionId: section._id,
    startNode: findNodeByNodeId("MAIN_N6")?._id,
    endNode: findNodeByNodeId("MAIN_N7")?._id
  });

  console.log(`   ✅ Created station: ${stationBhopal.stationName}`);
  console.log(`   ✅ Created station: ${stationVidisha.stationName}`);
  console.log(`   ✅ Created station: ${stationBina.stationName}`);

  // Link all tracks and stations to section
  section.tracks = [upTrack._id, mainTrack._id, downTrack._id];
  section.stations = [stationBhopal._id, stationVidisha._id, stationBina._id];
  await section.save();

  console.log("\n🎉 DONE! Section with 3 Tracks and 3 Stations created successfully!");
  console.log(`   📊 Total Nodes: ${savedUpNodes.length + savedMainNodes.length + savedDownNodes.length}`);
  console.log(`   📊 Total Edges: ${savedUpEdges.length + savedMainEdges.length + savedDownEdges.length}`);
  console.log(`   📊 Total Tracks: 3`);
  console.log(`   📊 Total Stations: 3 (Bhopal, Vidisha, Bina)`);

  process.exit(0);
}

generate().catch(err => {
  console.error("❌ ERROR:", err);
  process.exit(1);
});