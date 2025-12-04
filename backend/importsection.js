import fs from "fs";
import mongoose from "mongoose";

import Section from "./models/sectionSchema.js";
import Track from "./models/trackSchema.js";
import Block from "./models/blockSchema.js";
import Signal from "./models/signalSchema.js";
import Station from "./models/stationSchema.js";
import Train from "./models/trainSchema.js";

const FILE_PATH = "./section01_combined.json";

async function run() {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect("mongodb://mydbuser:sih2025@89.116.30.152:27017,89.116.30.152:27018,89.116.30.152:27019/mydb?replicaSet=rs0&authSource=mydb ");

    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const json = JSON.parse(raw);

    console.log("Loaded JSON:", FILE_PATH);

    // -------------------------------------------------------
    // 1️⃣ CREATE SECTION
    // -------------------------------------------------------
    const section = await Section.create({
      section_id: json.section_id,
      name: json.name,
      sectionLength: json.sectionLength,
      coordinates: json.coordinates,
    });

    console.log("Section created:", section._id);

    // -------------------------------------------------------
    // 2️⃣ INSERT STATIONS
    // -------------------------------------------------------
    for (const st of json.stations) {
      if (!st.station_name) continue; // skip empty entries

      const station = await Station.create({
        name: st.station_name,
        station_code: st.station_name,
      });

      console.log("Station:", station.name, station._id);

      const nodeMap = {};   // name → DB _id
      const blockMap = {};  // name → DB _id

      // -----------------------------------------------------
      // 2.1 INSERT NODES
      // -----------------------------------------------------
      for (const [nodeName, nodeObj] of Object.entries(st.nodes)) {
        const node = await Node.create({
          node_id: nodeName,
          x: nodeObj.x,
          y: nodeObj.y,
          station: station._id,
        });

        nodeMap[nodeName] = node._id;
      }

      console.log("Nodes inserted:", Object.keys(nodeMap).length);

      // -----------------------------------------------------
      // 2.2 INSERT BLOCKS
      // -----------------------------------------------------
      for (const [blockName, blockObj] of Object.entries(st.blocks)) {
        const block = await Block.create({
          block_id: blockName,
          line: blockObj.line,
          type: blockObj.type,
          length: blockObj.length,
          start_node: nodeMap[blockObj.start_node],
          end_node: nodeMap[blockObj.end_node],
          station: station._id,
        });

        blockMap[blockName] = block._id;
      }

      console.log("Blocks inserted:", Object.keys(blockMap).length);

      // -----------------------------------------------------
      // 2.3 INSERT SIGNALS
      // -----------------------------------------------------
      for (const [sigName, sigObj] of Object.entries(st.signals)) {
        await Signal.create({
          signal_id: sigName,
          name: sigName,
          type: sigObj.type,
          direction: sigObj.direction,
          node: nodeMap[sigObj.node],
          protects_block: blockMap[sigObj.protects_block],
          inner_block: sigObj.inner_block ? blockMap[sigObj.inner_block] : null,
          outer_block: sigObj.outer_block ? blockMap[sigObj.outer_block] : null,
          follows: sigObj.follows || null,
          station: station._id,
        });
      }

      console.log("Signals inserted:", Object.keys(st.signals).length);

      // -----------------------------------------------------
      // 2.4 INSERT SWITCHES
      // -----------------------------------------------------
      for (const [swName, swObj] of Object.entries(st.switches)) {
        await Switch.create({
          name: swName,
          node: nodeMap[swObj.node],
          state: swObj.state,
          station: station._id,
          branches: swObj.branches.map(br => ({
            name: br.name,
            from_block: blockMap[br.from_block],
            to_block: blockMap[br.to_block]
          }))
        });
      }

      console.log("Switches inserted:", Object.keys(st.switches).length);

      // -----------------------------------------------------
      // Update station relations
      // -----------------------------------------------------
      station.nodes = Object.values(nodeMap);
      station.blocks = Object.values(blockMap);
      await station.save();

      // -----------------------------------------------------
      // Add station to section
      // -----------------------------------------------------
      section.stations.push(station._id);
    }

    await section.save();

    console.log("FINAL: Section imported successfully ✔");
    process.exit(0);

  } catch (err) {
    console.error("ERR:", err);
    process.exit(1);
  }
}

run();
