import mongoose from "mongoose";
import Train from "./models/trainSchema.js";
import Edge from "./models/edgeSchema.js";
import Station from "./models/stationSchema.js";

await mongoose.connect("mongodb://127.0.0.1:27017/railway_sim");
console.log("✅ Connected to MongoDB");

// =============================================
// FETCH STATIONS FROM DATABASE
// =============================================
const stations = await Station.find({});
console.log(`📍 Found ${stations.length} stations:`, stations.map(s => s.stationName).join(", "));

// Helper to generate time strings
function addMinutes(baseTime, minutes) {
  const [h, m] = baseTime.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

// Create schedule for a train based on direction and departure time
function createSchedule(direction, departureTime, trainType) {
  // Time between stations based on train type
  const travelTime = trainType === "Express" ? 25 : trainType === "Superfast" ? 30 : 45;
  const haltTime = trainType === "Freight" ? 15 : 5;
  const platformTime = 10; // Time train is at platform before departure at origin

  if (direction === "UP") {
    // UP direction: Bhopal (origin) → Vidisha → Bina (terminus)
    const bhopalDep = departureTime;
    const bhopalArr = addMinutes(departureTime, -platformTime); // Arrives at platform before departure
    
    const vidishaArr = addMinutes(bhopalDep, travelTime);
    const vidishaDep = addMinutes(vidishaArr, haltTime);
    
    const binaArr = addMinutes(vidishaDep, travelTime);
    const binaDep = addMinutes(binaArr, haltTime); // Departure for next section
    
    return {
      bhopal: {
        scheduledArrival: bhopalArr,
        scheduledDeparture: bhopalDep,
        actualArrival: "",
        actualDeparture: "",
        expectedDeparture: ""
      },
      vidisha: {
        scheduledArrival: vidishaArr,
        scheduledDeparture: vidishaDep,
        actualArrival: "",
        actualDeparture: "",
        expectedDeparture: ""
      },
      bina: {
        scheduledArrival: binaArr,
        scheduledDeparture: binaDep,
        actualArrival: "",
        actualDeparture: "",
        expectedDeparture: ""
      }
    };
  } else {
    // DOWN direction: Bina (origin) → Vidisha → Bhopal (terminus)
    const binaDep = departureTime;
    const binaArr = addMinutes(departureTime, -platformTime); // Arrives at platform before departure
    
    const vidishaArr = addMinutes(binaDep, travelTime);
    const vidishaDep = addMinutes(vidishaArr, haltTime);
    
    const bhopalArr = addMinutes(vidishaDep, travelTime);
    const bhopalDep = addMinutes(bhopalArr, haltTime); // Departure for next section
    
    return {
      bhopal: {
        scheduledArrival: bhopalArr,
        scheduledDeparture: bhopalDep,
        actualArrival: "",
        actualDeparture: "",
        expectedDeparture: ""
      },
      vidisha: {
        scheduledArrival: vidishaArr,
        scheduledDeparture: vidishaDep,
        actualArrival: "",
        actualDeparture: "",
        expectedDeparture: ""
      },
      bina: {
        scheduledArrival: binaArr,
        scheduledDeparture: binaDep,
        actualArrival: "",
        actualDeparture: "",
        expectedDeparture: ""
      }
    };
  }
}

// =============================================
// TRAIN DEFINITIONS
// =============================================

// Passenger trains (high priority)
const PASSENGER_TRAINS = [
  {
    trainId: "12001",
    trainName: "Bhopal Shatabdi Express",
    trainType: "Express",
    trainCategory: "Passenger",
    basePriority: 1,
    trainPriority: 1,
    maxTrainCapacity: 1200,
    isEmergency: false,
    direction: "UP",
    maxSpeed: 160,
    departureTime: "06:00"
  },
  {
    trainId: "12002",
    trainName: "Bhopal Shatabdi Express",
    trainType: "Express",
    trainCategory: "Passenger",
    basePriority: 1,
    trainPriority: 1,
    maxTrainCapacity: 1200,
    isEmergency: false,
    direction: "DOWN",
    maxSpeed: 160,
    departureTime: "18:00"
  },
  {
    trainId: "12155",
    trainName: "Nizamuddin Habibganj SF",
    trainType: "Superfast",
    trainCategory: "Passenger",
    basePriority: 2,
    trainPriority: 2,
    maxTrainCapacity: 1800,
    isEmergency: false,
    direction: "UP",
    maxSpeed: 130,
    departureTime: "07:30"
  },
  {
    trainId: "12156",
    trainName: "Habibganj Nizamuddin SF",
    trainType: "Superfast",
    trainCategory: "Passenger",
    basePriority: 2,
    trainPriority: 2,
    maxTrainCapacity: 1800,
    isEmergency: false,
    direction: "DOWN",
    maxSpeed: 130,
    departureTime: "16:30"
  },
  {
    trainId: "12627",
    trainName: "Karnataka Express",
    trainType: "Express",
    trainCategory: "Passenger",
    basePriority: 3,
    trainPriority: 3,
    maxTrainCapacity: 2000,
    isEmergency: false,
    direction: "UP",
    maxSpeed: 110,
    departureTime: "09:00"
  }
];

// Freight trains (low priority)
const FREIGHT_TRAINS = [
  { id: "BCNA-101", name: "Coal Rake BPL-BINA", type: "BCNA", direction: "UP", departure: "05:00" },
  { id: "BCNA-102", name: "Coal Rake BINA-BPL", type: "BCNA", direction: "DOWN", departure: "05:30" },
  { id: "BOXN-201", name: "Iron Ore Rake 1", type: "BOXN", direction: "UP", departure: "08:00" },
  { id: "BOXN-202", name: "Iron Ore Rake 2", type: "BOXN", direction: "DOWN", departure: "08:30" },
  { id: "BTPN-301", name: "Petroleum Tanker 1", type: "BTPN", direction: "UP", departure: "10:00" },
  { id: "BTPN-302", name: "Petroleum Tanker 2", type: "BTPN", direction: "DOWN", departure: "10:30" },
  { id: "BCNA-103", name: "Coal Rake Express", type: "BCNA", direction: "UP", departure: "11:00" },
  { id: "BOXN-203", name: "Steel Coil Rake", type: "BOXN", direction: "DOWN", departure: "11:30" },
  { id: "CONT-401", name: "Container Special 1", type: "CONT", direction: "UP", departure: "13:00" },
  { id: "CONT-402", name: "Container Special 2", type: "CONT", direction: "DOWN", departure: "13:30" },
  { id: "BCNA-104", name: "Cement Rake 1", type: "BCNA", direction: "UP", departure: "14:00" },
  { id: "BCNA-105", name: "Cement Rake 2", type: "BCNA", direction: "DOWN", departure: "14:30" },
  { id: "BOXN-204", name: "Grain Rake 1", type: "BOXN", direction: "UP", departure: "15:00" },
  { id: "BOXN-205", name: "Grain Rake 2", type: "BOXN", direction: "DOWN", departure: "15:30" },
  { id: "BTPN-303", name: "LPG Tanker Special", type: "BTPN", direction: "UP", departure: "17:00" }
];

async function seedTrains() {
  try {
    // Clear existing trains
    await Train.deleteMany({});
    console.log("🗑️ Cleared existing trains");

    // Reset all edges to not occupied
    await Edge.updateMany({}, { isOccupied: false });
    console.log("🔄 Reset all edges to not occupied");

    // Fetch all edges for placing trains
    const allEdges = await Edge.find({});
    console.log(`📊 Found ${allEdges.length} edges in database`);

    // Filter edges by type and direction
    const upBlockEdges = allEdges.filter(e => e.direction === "UP" && e.edgeType === "block");
    const downBlockEdges = allEdges.filter(e => e.direction === "DOWN" && e.edgeType === "block");
    const upAutoEdges = allEdges.filter(e => e.direction === "UP" && e.edgeType === "automatic");
    const downAutoEdges = allEdges.filter(e => e.direction === "DOWN" && e.edgeType === "automatic");
    const upLoopEdges = allEdges.filter(e => e.direction === "UP" && e.edgeType === "loop");
    const downLoopEdges = allEdges.filter(e => e.direction === "DOWN" && e.edgeType === "loop");
    const mainBlockEdges = allEdges.filter(e => e.direction === "BOTH" && e.edgeType === "block");

    const createdTrains = [];

    // =============================================
    // CREATE PASSENGER TRAINS
    // =============================================
    console.log("\n🚆 Creating passenger trains...");

    // Edges for placing passenger trains (creating conflicts)
    const passengerEdgePlacements = [
      upBlockEdges.find(e => e.edgeId === "UP_E3")?.edgeId || "UP_E1",
      downBlockEdges.find(e => e.edgeId === "DOWN_E3")?.edgeId || "DOWN_E1",
      upAutoEdges.find(e => e.edgeId === "UP_AUTO_E1")?.edgeId || "UP_E2",
      downAutoEdges.find(e => e.edgeId === "DOWN_AUTO_E2")?.edgeId || "DOWN_E2",
      mainBlockEdges.find(e => e.edgeId === "MAIN_E3")?.edgeId || "MAIN_E1"
    ];

    for (let i = 0; i < PASSENGER_TRAINS.length; i++) {
      const trainData = PASSENGER_TRAINS[i];
      const edgeId = passengerEdgePlacements[i] || "";
      
      const train = await Train.create({
        trainId: trainData.trainId,
        trainName: trainData.trainName,
        trainType: trainData.trainType,
        trainCategory: trainData.trainCategory,
        basePriority: trainData.basePriority,
        trainPriority: trainData.trainPriority,
        maxTrainCapacity: trainData.maxTrainCapacity,
        maxSpeed: trainData.maxSpeed,
        currentEdge: edgeId,
        direction: trainData.direction,
        isEmergency: trainData.isEmergency,
        schedule: createSchedule(trainData.direction, trainData.departureTime, trainData.trainType)
      });

      createdTrains.push(train);
      console.log(`   ✅ ${train.trainName} (${train.trainId}) | Speed: ${train.maxSpeed} km/h | Edge: ${edgeId}`);

      // Mark edge as occupied
      if (edgeId) {
        await Edge.updateOne({ edgeId }, { isOccupied: true });
      }
    }

    // =============================================
    // CREATE FREIGHT TRAINS
    // =============================================
    console.log("\n🚂 Creating freight trains...");

    // Collect all available edges for freight placement
    const freightEdgePlacements = [
      "UP_E1", "DOWN_E1", "UP_E4", "DOWN_E4",
      "UP_AUTO_E2", "DOWN_AUTO_E1",
      upLoopEdges[0]?.edgeId || "UP_A_LOOP1",
      downLoopEdges[0]?.edgeId || "DOWN_A_LOOP1",
      upLoopEdges[2]?.edgeId || "UP_B_LOOP1",
      downLoopEdges[2]?.edgeId || "DOWN_B_LOOP1",
      "MAIN_E1", "MAIN_E4",
      upLoopEdges[4]?.edgeId || "UP_C_LOOP1",
      downLoopEdges[4]?.edgeId || "DOWN_C_LOOP1",
      "UP_AUTO_E3"
    ];

    for (let i = 0; i < FREIGHT_TRAINS.length; i++) {
      const ft = FREIGHT_TRAINS[i];
      const edgeId = freightEdgePlacements[i] || "";
      
      const train = await Train.create({
        trainId: ft.id,
        trainName: ft.name,
        trainType: ft.type,
        trainCategory: "Freight",
        basePriority: 10,
        trainPriority: 10 + (i % 5),
        maxTrainCapacity: 5000,
        maxSpeed: 65,
        currentEdge: edgeId,
        direction: ft.direction,
        isEmergency: false,
        schedule: createSchedule(ft.direction, ft.departure, "Freight")
      });

      createdTrains.push(train);
      console.log(`   ✅ ${train.trainName} (${train.trainId}) | Speed: ${train.maxSpeed} km/h | Edge: ${edgeId}`);

      // Mark edge as occupied
      if (edgeId) {
        await Edge.updateOne({ edgeId }, { isOccupied: true });
      }
    }

    // =============================================
    // PRINT SAMPLE SCHEDULES
    // =============================================
    console.log("\n" + "=".repeat(60));
    console.log("📅 SAMPLE TRAIN SCHEDULES:");
    console.log("=".repeat(60));
    
    const sampleTrain = createdTrains[0];
    console.log(`\n${sampleTrain.trainName} (${sampleTrain.trainId}) - ${sampleTrain.direction}`);
    console.log(`Max Speed: ${sampleTrain.maxSpeed} km/h`);
    console.log("Schedule:");
    console.log(`  Bhopal:  Dep ${sampleTrain.schedule.bhopal.scheduledDeparture || "Origin"}`);
    console.log(`  Vidisha: Arr ${sampleTrain.schedule.vidisha.scheduledArrival} | Dep ${sampleTrain.schedule.vidisha.scheduledDeparture}`);
    console.log(`  Bina:    Arr ${sampleTrain.schedule.bina.scheduledArrival || "Terminus"}`);

    const sampleFreight = createdTrains[5];
    console.log(`\n${sampleFreight.trainName} (${sampleFreight.trainId}) - ${sampleFreight.direction}`);
    console.log(`Max Speed: ${sampleFreight.maxSpeed} km/h`);
    console.log("Schedule:");
    if (sampleFreight.direction === "UP") {
      console.log(`  Bhopal:  Dep ${sampleFreight.schedule.bhopal.scheduledDeparture || "Origin"}`);
      console.log(`  Vidisha: Arr ${sampleFreight.schedule.vidisha.scheduledArrival} | Dep ${sampleFreight.schedule.vidisha.scheduledDeparture}`);
      console.log(`  Bina:    Arr ${sampleFreight.schedule.bina.scheduledArrival || "Terminus"}`);
    } else {
      console.log(`  Bina:    Dep ${sampleFreight.schedule.bina.scheduledDeparture || "Origin"}`);
      console.log(`  Vidisha: Arr ${sampleFreight.schedule.vidisha.scheduledArrival} | Dep ${sampleFreight.schedule.vidisha.scheduledDeparture}`);
      console.log(`  Bhopal:  Arr ${sampleFreight.schedule.bhopal.scheduledArrival || "Terminus"}`);
    }

    // =============================================
    // SUMMARY
    // =============================================
    console.log("\n" + "=".repeat(60));
    console.log(`🎉 DONE! Created ${createdTrains.length} trains total`);
    console.log(`   • Passenger: ${PASSENGER_TRAINS.length} (speeds: 110-160 km/h)`);
    console.log(`   • Freight: ${FREIGHT_TRAINS.length} (speed: 65 km/h)`);
    console.log("=".repeat(60));

    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedTrains();
