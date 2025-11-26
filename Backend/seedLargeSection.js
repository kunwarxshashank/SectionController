// seed/seedLargeSectionWithLoops.js
import mongoose from "mongoose";

import Section from "./models/sectionSchema.js";
import Station from "./models/stationSchema.js";
import Track from "./models/trackSchema.js";
import Block from "./models/blockSchema.js";
import Signal from "./models/signalSchema.js";
import Train from "./models/trainSchema.js";

const MONGO = "mongodb://127.0.0.1:27017/railway-demo";

async function seed() {
  try {
    await mongoose.connect(MONGO);
    console.log("Connected to MongoDB");

    // ------------------------------
    // CLEAR OLD DATA
    // ------------------------------
    await Promise.all([
      Section.deleteMany({}),
      Station.deleteMany({}),
      Track.deleteMany({}),
      Block.deleteMany({}),
      Signal.deleteMany({}),
      Train.deleteMany({})
    ]);
    console.log("Cleared old data.");

    // ------------------------------
    // CONFIG
    // ------------------------------
    const TOTAL_BLOCKS = 20;     // per main line (reduced)
    const BLOCK_LENGTH = 2000;   // metres (2 km) smaller blocks
    const LOOP_BLOCK_LEN = 1000; // loop block length (shorter)
    const HEADWAY = 120;         // 2 minutes safe headway

    const STATIONS = [
      { name: "Shahpura Road", station_code: "SPR", position: [23.450, 77.810] },
      { name: "Sehore",        station_code: "SEH", position: [23.330, 77.100] },
      { name: "Bairagarh",     station_code: "BIH", position: [23.280, 77.470] },
      { name: "Bhopal Jn",     station_code: "BPL", position: [23.2599, 77.4126] },
      { name: "Habibganj",     station_code: "HBJ", position: [23.2322, 77.4445] }
    ];

    // loop positions (0-based index of main block after which loop diverts)
    // choose a few positions evenly spaced
    const LOOP_INDICES = [4, 10, 16];

    // ------------------------------
    // CREATE STATIONS
    // ------------------------------
    const stationDocs = await Station.insertMany(
      STATIONS.map(s => ({ name: s.name, station_code: s.station_code, position: s.position }))
    );
    console.log("Stations created:", stationDocs.map(s => s.station_code).join(", "));

    // ------------------------------
    // CREATE SECTION
    // ------------------------------
    const section = await Section.create({
      section_id: "SEC_LARGE_01",
      name: "Shahpura - Habibganj (Short) Section",
      coordinates: [23.350, 77.500],
      stations: stationDocs.map(s => s._id),
      tracks: []
    });
    console.log("Section created:", section.name);

    // ------------------------------
    // CREATE MAIN TRACKS
    // ------------------------------
    const upMain = await Track.create({
      track_id: "UP_MAIN_L01",
      name: "UP_MAIN",
      direction: "UP",
      type: "MAIN",
      isLoop: false,
      parentTrack: null,
      section: section._id,
      blocks: []
    });
    const downMain = await Track.create({
      track_id: "DOWN_MAIN_L01",
      name: "DOWN_MAIN",
      direction: "DOWN",
      type: "MAIN",
      isLoop: false,
      parentTrack: null,
      section: section._id,
      blocks: []
    });

    // push main tracks into section
    section.tracks.push(upMain._id, downMain._id);
    await section.save();
    console.log("Main tracks created and linked to section.");

    // ------------------------------
    // generate utility for straight coords (very simple)
    // ------------------------------
    function lineCoords(start, end) {
      // return [lon, lat] pairs for a line
      return [
        [start[1], start[0]],
        [end[1], end[0]]
      ];
    }
    const start = STATIONS[0].position;
    const end = STATIONS[STATIONS.length - 1].position;

    // ------------------------------
    // CREATE MAIN BLOCKS + SIGNALS
    // ------------------------------
    const upBlocks = [];
    const downBlocks = [];

    for (let i = 0; i < TOTAL_BLOCKS; i++) {
      const coords = lineCoords(start, end);

      const upSignal = await Signal.create({
        signal_id: `UP_SIG_${i + 1}`,
        aspect: "GREEN",
        position: coords[1]
      });
      const upBlock = await Block.create({
        block_id: `UP_BLK_${i + 1}`,
        index: i + 1,
        length_m: BLOCK_LENGTH,
        max_speed_kmph: 110,
        blockType: "MAIN",
        loopId: null,
        trackDirection: "UP",
        headwaySeconds: HEADWAY,
        track: upMain._id,
        geometry: { type: "LineString", coordinates: coords },
        signal: upSignal._id
      });
      upBlocks.push(upBlock._id);

      const downSignal = await Signal.create({
        signal_id: `DN_SIG_${i + 1}`,
        aspect: "GREEN",
        position: coords[0]
      });
      const downBlock = await Block.create({
        block_id: `DN_BLK_${i + 1}`,
        index: i + 1,
        length_m: BLOCK_LENGTH,
        max_speed_kmph: 110,
        blockType: "MAIN",
        loopId: null,
        trackDirection: "DOWN",
        headwaySeconds: HEADWAY,
        track: downMain._id,
        geometry: { type: "LineString", coordinates: coords },
        signal: downSignal._id
      });
      downBlocks.push(downBlock._id);
    }

    // link prev/next for mains
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
      const updates = {};
      if (i > 0) updates.prevBlocks = [ (i > 0 ? upBlocks[i - 1] : null) ].filter(Boolean);
      if (i < TOTAL_BLOCKS - 1) updates.nextBlocks = [ upBlocks[i + 1] ];
      if (Object.keys(updates).length) await Block.findByIdAndUpdate(upBlocks[i], updates);

      const downUpdates = {};
      if (i > 0) downUpdates.prevBlocks = [ (i > 0 ? downBlocks[i - 1] : null) ].filter(Boolean);
      if (i < TOTAL_BLOCKS - 1) downUpdates.nextBlocks = [ downBlocks[i + 1] ];
      if (Object.keys(downUpdates).length) await Block.findByIdAndUpdate(downBlocks[i], downUpdates);
    }

    // attach blocks list to main tracks
    await Track.findByIdAndUpdate(upMain._id, { blocks: upBlocks });
    await Track.findByIdAndUpdate(downMain._id, { blocks: downBlocks });

    console.log("Main blocks + signals created and linked.");

    // ------------------------------
    // CREATE LOOPS (as separate small loop tracks + loop blocks)
    // For each index in LOOP_INDICES, we will:
    //  - create a loop Track
    //  - create 2 small blocks (entry & exit) on loop track
    //  - patch main block nextBlocks to include loopEntry as alternate path
    //  - set prev/next of loop blocks to link mainPrev -> loopEntry -> loopExit -> mainNext
    // ------------------------------
    const createdLoopTracks = [];

    for (let loopIdx of LOOP_INDICES) {
      // safety: ensure loopIdx is within 0..TOTAL_BLOCKS-2 (so mainNext exists)
      if (loopIdx < 0 || loopIdx >= TOTAL_BLOCKS - 1) continue;

      const loopTrack = await Track.create({
        track_id: `UP_LOOP_AT_${loopIdx + 1}`,
        name: `UP_LOOP_${loopIdx + 1}`,
        direction: "UP",
        type: "LOOP",
        isLoop: true,
        parentTrack: upMain._id,
        loopPriority: 10,
        section: section._id,
        blocks: []
      });

      // small geometry: same coordinates for simplicity
      const coords = lineCoords(start, end);

      // create 2 loop blocks (entry, exit)
      const loopEntrySignal = await Signal.create({
        signal_id: `UP_LOOP_SIG_${loopIdx + 1}_E`,
        aspect: "GREEN",
        position: coords[1]
      });
      const loopEntryBlock = await Block.create({
        block_id: `UP_LOOP_${loopIdx + 1}_A`,
        index: loopIdx + 1,
        length_m: LOOP_BLOCK_LEN,
        max_speed_kmph: 50,
        blockType: "LOOP",
        loopId: loopTrack._id,
        trackDirection: "UP",
        headwaySeconds: HEADWAY,
        track: loopTrack._id,
        geometry: { type: "LineString", coordinates: coords },
        signal: loopEntrySignal._id
      });

      const loopExitSignal = await Signal.create({
        signal_id: `UP_LOOP_SIG_${loopIdx + 1}_X`,
        aspect: "GREEN",
        position: coords[1]
      });
      const loopExitBlock = await Block.create({
        block_id: `UP_LOOP_${loopIdx + 1}_B`,
        index: loopIdx + 2,
        length_m: LOOP_BLOCK_LEN,
        max_speed_kmph: 50,
        blockType: "LOOP",
        loopId: loopTrack._id,
        trackDirection: "UP",
        headwaySeconds: HEADWAY,
        track: loopTrack._id,
        geometry: { type: "LineString", coordinates: coords },
        signal: loopExitSignal._id
      });

      // link loop blocks
      await Block.findByIdAndUpdate(loopEntryBlock._id, { nextBlocks: [loopExitBlock._id], prevBlocks: [ upBlocks[loopIdx] ] });
      await Block.findByIdAndUpdate(loopExitBlock._id, { prevBlocks: [loopEntryBlock._id], nextBlocks: [ upBlocks[loopIdx + 1] ] });

      // modify main blocks: from upBlocks[loopIdx], nextBlocks should include both main next and loopEntry
      const mainNextId = upBlocks[loopIdx + 1];
      await Block.findByIdAndUpdate(upBlocks[loopIdx], { nextBlocks: [ mainNextId, loopEntryBlock._id ] });

      // ensure mainNext prevBlocks include loopExit as alternative prev (not strictly required but helpful)
      // add loopExit to prevBlocks of mainNext (append)
      const mainNextDoc = await Block.findById(mainNextId).lean();
      const mainNextPrev = (mainNextDoc.prevBlocks || []).map(x => x.toString());
      if (!mainNextPrev.includes(loopExitBlock._id.toString())) {
        mainNextPrev.push(loopExitBlock._id);
        await Block.findByIdAndUpdate(mainNextId, { prevBlocks: mainNextPrev });
      }

      // attach loop blocks to loopTrack
      await Track.findByIdAndUpdate(loopTrack._id, { blocks: [loopEntryBlock._id, loopExitBlock._id] });

      // push this loop track into section's tracks list (so exporter sees it)
      section.tracks.push(loopTrack._id);
      createdLoopTracks.push(loopTrack._id);

      console.log(`Created loop near main block ${loopIdx + 1}:`, loopTrack.track_id || loopTrack._id);
    }

    // save section to persist added loop tracks
    await section.save();

    // ------------------------------
    // CREATE TRAINS (mix) with some delayed/high priority
    // ------------------------------
    const trainTemplates = [
      ["Bhopal Express", "12156"],
      ["Shatabdi Express", "12002"],
      ["Narmada Express", "18234"],
      ["Rajdhani Express", "12434"],
      ["Jabalpur Intercity", "12198"],
      ["Freight Coal A1", "FRE001"],
      ["Freight Grain B4", "FRE002"],
      ["Goods Long C7", "FRE003"],
      ["Passenger Shuttle", "PSG01"],
      ["MEMU Local", "MEMU09"],
      ["Mail Express", "MAIL77"],
      ["SuperFast", "SF090"],
      ["Special Super", "SP001"],
      ["HighPrio Extra", "HP100"],
      ["Late Freight", "LF200"]
    ];

    // create trains and place randomly on upBlocks & downBlocks
    for (let i = 0; i < trainTemplates.length; i++) {
      const [name, number] = trainTemplates[i];
      // randomly choose up or down and block
      const isUp = Math.random() < 0.75; // bias towards UP
      const blockArray = isUp ? upBlocks : downBlocks;
      const blockId = blockArray[Math.floor(Math.random() * blockArray.length)];

      // make some special trains high priority + delayed
      let priority = i < 4 ? 10 : 3;
      let delay_min = Math.floor(Math.random() * 6); // small random delay by default

      if (name === "Rajdhani Express" || name === "Shatabdi Express") {
        priority = 12;
        delay_min = 10 + Math.floor(Math.random() * 20); // delayed high priority
      }
      if (name === "HighPrio Extra") {
        priority = 15;
        delay_min = 18;
      }
      if (name === "Late Freight") {
        priority = 2;
        delay_min = 25;
      }

      await Train.create({
        name,
        number,
        type: i >= 5 && i < 12 ? "FREIGHT" : "EXPRESS",
        perf: {},

        currentSection: section._id,
        current_block: blockId,
        offset_m: Math.floor(Math.random() * BLOCK_LENGTH),
        speed_kmph: 30 + Math.random() * 80,
        direction: isUp ? "UP" : "DOWN",
        delay_min,
        priority,
        status: "RUNNING"
      });
    }

    console.log("Trains created with some high-priority delayed entries.");

    console.log("✔ NEW SECTION SEEDED WITH LOOPS SUCCESSFULLY ✔");
    process.exit(0);

  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
