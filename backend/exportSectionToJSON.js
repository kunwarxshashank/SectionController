// exportSectionToJSON.js
import mongoose from "mongoose";
import fs from "fs";

import Section from "./models/sectionSchema.js";
import Station from "./models/stationSchema.js";
import Track from "./models/trackSchema.js";
import Block from "./models/blockSchema.js";
import Signal from "./models/signalSchema.js";
import Train from "./models/trainSchema.js";

const MONGO = "mongodb://127.0.0.1:27017/railway-demo";

async function exportJSON() {
  await mongoose.connect(MONGO);
  console.log("Connected.");

  const section = await Section.findOne({ section_id: "SEC_LARGE_01" })
    .populate("stations")
    .populate("tracks");

  if (!section) {
    console.log("Section not found");
    return;
  }

  const output = {
    section: {
      id: section._id,
      name: section.name,
      coordinates: section.coordinates
    },

    stations: section.stations.map(s => ({
      id: s._id,
      name: s.name,
      code: s.station_code,     // ✔ FIXED
      position: s.position
    })),

    tracks: [],
    trains: []
  };

  for (const track of section.tracks) {
    const blocks = await Block.find({ track: track._id }).populate("signal");

    output.tracks.push({
      id: track._id,
      track_id: track.track_id,
      name: track.name,
      type: track.type,
      direction: track.direction,
      isLoop: track.isLoop || false,
      parentTrack: track.parentTrack || null,

      blocks: blocks.map(b => ({
        id: b._id,
        block_id: b.block_id,
        index: b.index,
        length_m: b.length_m,
        max_speed_kmph: b.max_speed_kmph,
        blockType: b.blockType || "MAIN",
        loopId: b.loopId,
        trackDirection: b.trackDirection,
        headwaySeconds: b.headwaySeconds,
        nextBlocks: b.nextBlocks,
        prevBlocks: b.prevBlocks,
        geometry: b.geometry,
        signal: b.signal
          ? {
              id: b.signal._id,
              aspect: b.signal.aspect,
              position: b.signal.position
            }
          : null
      }))
    });
  }

  const trains = await Train.find({ currentSection: section._id });

  output.trains = trains.map(tr => ({
    id: tr._id,
    name: tr.name,
    number: tr.number,
    type: tr.type,
    priority: tr.priority,
    delay_min: tr.delay_min,
    current_block: tr.current_block,
    offset_m: tr.offset_m,
    speed_kmph: tr.speed_kmph,
    direction: tr.direction,
    lat: tr.lat,
    lon: tr.lon,
    status: tr.status,
    perf: tr.perf
  }));

  fs.writeFileSync("sectionData.json", JSON.stringify(output, null, 2));
  console.log("✔ Export complete: sectionData.json");
}

exportJSON();
