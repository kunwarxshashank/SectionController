import fs from "fs";
import mongoose from "mongoose";

import Section from "./models/sectionSchema.js";
import Station from "./models/stationSchema.js";
import Node from "./models/nodeSchema.js";
import Edge from "./models/edgeSchema.js";

import dotenv from "dotenv";
dotenv.config();

/* ---------------------------------------------
   🔧 Helpers: Normalizers
--------------------------------------------- */

function normalizeNodeType(type) {
    if (!type) return "";

    const mapping = {
        "section_start": "sectionStart",
        "section_end": "sectionEnd",
        "station_start": "stationStart",
        "station_end": "stationEnd",
        "loop_start": "loopStart",
        "loop_end": "loopEnd",
        "loop_corner": "loopCorner",
        "signal_home": "signalHome",
        "signal_advance": "signalAdvance",
        "signal_starter": "signalStarter",
        "signal_automatic": "signalAutomatic",
        "track_node": "track_node",
        "switch": "switch",
        "platform": "platform",
        "turning": "turningPoint",
    };

    return mapping[type] || type;
}

function normalizeStream(stream) {
    if (!stream) return "BIDIRECTIONAL";
    const s = stream.toLowerCase();
    if (s === "up") return "UP";
    if (s === "down" || s === "dn") return "DN";
    return "BIDIRECTIONAL";
}

function normalizeDirection(dir) {
    if (!dir) return "BIDIRECTIONAL";
    const d = dir.toLowerCase();
    if (d === "unidirectional" || d === "uni") return "UNIDIRECTIONAL";
    if (d === "bidirectional" || d === "bi") return "BIDIRECTIONAL";

    return "BIDIRECTIONAL"; // fallback
}


const JSON_PATH = "./database_schema.json";

/* ---------------------------------------------
   🚀 Main Seeding Function
--------------------------------------------- */

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MongoUrl);
        console.log("✅ Connected to MongoDB");

        // Clear old data
        await Promise.all([
            Section.deleteMany({}),
            Station.deleteMany({}),
            Node.deleteMany({}),
            Edge.deleteMany({})
        ]);

        console.log("🗑️ Old data cleared");

        // Load JSON
        const raw = fs.readFileSync(JSON_PATH);
        const json = JSON.parse(raw);

        const allNodes = json.nodes;
        const allEdges = json.edges;

        /* ---------------------------------------------
           🏗️ Create Section
        --------------------------------------------- */
        const section = await Section.create({
            section_id: json.railway_section.name,
            name: json.railway_section.name,
            tracks: [],
            stations: []
        });

        console.log(`📌 Section created: ${section.name}`);


        /* ---------------------------------------------
           📂 Group Nodes & Edges by Station
        --------------------------------------------- */
        const nodesByStation = {};
        const edgesByStation = {};

        for (const n of allNodes) {
            if (!nodesByStation[n.station]) nodesByStation[n.station] = [];
            nodesByStation[n.station].push(n);
        }

        for (const e of allEdges) {
            const station = e.station || "UNKNOWN";
            if (!edgesByStation[station]) edgesByStation[station] = [];
            edgesByStation[station].push(e);
        }


        /* ---------------------------------------------
           🏭 Create Stations + Save Nodes + Edges
        --------------------------------------------- */
        for (const stationName of Object.keys(nodesByStation)) {
            console.log(`\n🚉 Processing Station: ${stationName}`);

            const rawNodeList = nodesByStation[stationName];
            const rawEdgeList = edgesByStation[stationName] || [];



            /* ------------------ Save NODES ------------------ */
            const savedNodes = await Node.insertMany(
                rawNodeList.map(n => ({
                    nodeId: n.nodeId,
                    nodeType: normalizeNodeType(n.nodeType),
                    x: n.x || 0,
                    y: n.y || 0,
                    name: n.name || "",
                    line: n.line || "",
                    description: n.description || "",
                    status: n.status || "active",
                    station: n.station || "",
                    signalColor: n.signalColor || "green"
                }))
            );

            console.log(`   ➤ Saved ${savedNodes.length} Nodes`);




            /* ------------------ Save EDGES ------------------ */
            const savedEdges = await Edge.insertMany(
                rawEdgeList.map(e => ({
                    edgeId: e.id,
                    startNode: e.startNode,
                    endNode: e.endNode,
                    stream: e.stream,
                    edgeColor: e.edgeColor || "",
                    direction: normalizeDirection(e.direction),
                    edgeType: e.edgeType || "",
                    edgeLength: e.edgeLength,
                    speed_limit: e.speed_limit || "",
                    status: e.status,
                    station: e.station,
                    restrictions: e.restrictions || ""
                }))
            );

            console.log(`   ➤ Saved ${savedEdges.length} Edges`);




            /* ------------------ CREATE STATION ------------------ */
            const stationDoc = await Station.create({
                stationId: stationName.toLowerCase().replace(/\s+/g, "_"),
                stationName,
                sectionId: section._id,
                totalTracks: {},   // 👈 IGNORE FOR NOW
                nodes: savedNodes.map(n => n._id),
                edges: savedEdges.map(e => e._id),
                locoPilot: []
            });

            /* ------------------ LINK STATION TO SECTION ------------------ */
            section.stations.push(stationDoc._id);
        }

        await section.save();

        console.log("\n🎉 DATABASE SEEDED SUCCESSFULLY!");
        process.exit();

    } catch (err) {
        console.error("❌ ERROR SEEDING:", err);
        process.exit(1);
    }
}

seedDatabase();