// seedDatabase.js
import fs from "fs";
import mongoose from "mongoose";

import Section from "./models/sectionSchema.js";
import Station from "./models/stationSchema.js";
import Node from "./models/nodeSchema.js";
import Edge from "./models/edgeSchema.js";
import Track from "./models/trackSchema.js";

import dotenv from "dotenv";
dotenv.config();

/* ---------------------------------------------
   🔧 Helpers: Normalizers to fix schema conflicts
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
    if (s === "down") return "DN";
    if (s === "dn") return "DN";
    if (s === "bidirectional") return "BIDIRECTIONAL";

    return "BIDIRECTIONAL"; // DEFAULT, NEVER return ""
}

function normalizeDirection(dir) {
    if (!dir) return "BIDIRECTIONAL";

    const d = dir.toLowerCase();

    if (d === "up") return "UP";
    if (d === "down") return "DN";
    if (d === "dn") return "DN";
    if (d === "unidirectional") return "UP";
    if (d === "bidirectional") return "BIDIRECTIONAL";

    return "BIDIRECTIONAL";
}


/* ---------------------------------------------
   📌 JSON File Path
--------------------------------------------- */

const JSON_PATH = "./database_schema.json";

/* ---------------------------------------------
   🚀 Main Seeding Function
--------------------------------------------- */

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MongoUrl);
        console.log("✅ Connected to MongoDB");

        // Wipe old data
        await Promise.all([
            Section.deleteMany({}),
            Station.deleteMany({}),
            Node.deleteMany({}),
            Edge.deleteMany({}),
            Track.deleteMany({})
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
            let station = e.station || "UNKNOWN";
            if (!edgesByStation[station]) edgesByStation[station] = [];
            edgesByStation[station].push(e);
        }

        /* ---------------------------------------------
           🏭 Create Stations, Nodes, Edges, Tracks
        --------------------------------------------- */
        for (const stationName of Object.keys(nodesByStation)) {
            console.log(`\n🚉 Processing Station: ${stationName}`);

            /* ------------------ NODES ------------------ */
            const insertedNodes = await Node.insertMany(
                nodesByStation[stationName].map(n => ({
                    nodeId: n.id,
                    nodeType: normalizeNodeType(n.type),
                    x: n.x || 0,
                    y: n.y || 0,
                    name: n.name || "",
                    line: n.line || "",
                    description: n.description || "",
                    status: n.status || "active",
                    signalColor: n.color || "red",
                }))
            );

            console.log(`   ➤ Saved ${insertedNodes.length} nodes`);

            /* ------------------ EDGES ------------------ */
            const stationEdges = edgesByStation[stationName] || [];

            const insertedEdges = await Edge.insertMany(
                stationEdges.map(e => ({
                    edgeId: e.id,
                    startNode: e.from,
                    endNode: e.to,
                    edgeType: e.track_type || "",
                    stream: normalizeStream(e.stream_type),
                    signal: e.color || "",
                    direction: normalizeDirection(e.direction),
                    maxspeed: e.length_m || "",
                    restrictions: e.restrictions || ""
                }))
            );

            console.log(`   ➤ Saved ${insertedEdges.length} edges`);

            /* ------------------ TRACK ------------------ */
            const track = await Track.create({
                sectionId: section._id,
                nodes: insertedNodes.map(n => n._id),
                edges: insertedEdges.map(e => e._id)
            });

            /* ------------------ STATION ------------------ */
            const stationDoc = await Station.create({
                stationId: stationName.toLowerCase().replace(/\s+/g, "_"),
                stationName,
                sectionId: section._id,
                totalTracks: {},
                nodes: insertedNodes.map(n => n._id)
            });

            /* ------------------ LINK TO SECTION ------------------ */
            section.tracks.push(track._id);
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
