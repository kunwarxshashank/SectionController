// controllers/sectionDisplay.controller.js

import Section from "../models/sectionSchema.js";
import Track from "../models/trackSchema.js";
import Block from "../models/blockSchema.js";
import Signal from "../models/signalSchema.js";
import Station from "../models/stationSchema.js";
import Train from "../models/trainSchema.js";

/*export const getSectionDisplay = async (req, res) => {
  try {
    console.log(`Api calls: `, req.params.id)
    const sectionId = req.params.id;

    // 1. Load section with tracks + stations
    const section = await Section.findById(sectionId)
      .populate("tracks")
      .populate("stations")
      .lean();

    if (!section) {
      return res.status(404).json({ msg: "Section not found" });
    }

    // 2. Build detailed Track → Blocks → Signals tree
    const tracks = [];

    for (const trackRef of section.tracks) {
      const blocks = await Block.find({ track: trackRef._id })
        .populate("signal")
        .lean();

      tracks.push({
        id: trackRef._id,
        track_id: trackRef.track_id,
        name: trackRef.name,
        direction: trackRef.direction,
        type: trackRef.type,
        isLoop: trackRef.isLoop,
        parentTrack: trackRef.parentTrack,
        loopPriority: trackRef.loopPriority,

        blocks: blocks.map(b => ({
          id: b._id,
          block_id: b.block_id,
          index: b.index,
          length_m: b.length_m,
          max_speed_kmph: b.max_speed_kmph,

          blockType: b.blockType,
          loopId: b.loopId,
          trackDirection: b.trackDirection,
          headwaySeconds: b.headwaySeconds,

          geometry: b.geometry,

          nextBlocks: b.nextBlocks,
          prevBlocks: b.prevBlocks,

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

    // 3. Load active trains inside section
    const trains = await Train.find({ currentSection: sectionId }).lean();

    const trainDisplay = trains.map(tr => ({
      id: tr._id,
      name: tr.name,
      number: tr.number,
      type: tr.type,
      priority: tr.priority,

      blockId: tr.current_block,
      offset_m: tr.offset_m,
      speed_kmph: tr.speed_kmph,
      delay_min: tr.delay_min,
      direction: tr.direction,

      lat: tr.lat,
      lon: tr.lon,
      status: tr.status
    }));

    // 4. Return the full structured response
    res.json({
      section: {
        id: section._id,
        name: section.name,
        sectionLength: section.sectionLength,
        coordinates: section.coordinates,
      },

      tracks,
      stations: section.stations,
      trains: trainDisplay
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// controllers/sectionExport.controller.js



export const exportSectionData = async (req, res) => {
  try {
    console.log("API Call: exportSectionData");

    const sectionId = req.params.id;  // you can pass section_id or _id

    const section = await Section.findOne({
      $or: [
        { section_id: sectionId },
        { _id: sectionId }
      ]
    })
      .populate("stations")
      .populate("tracks");

    if (!section) {
      return res.status(404).json({ msg: "Section not found" });
    }

    // --- IDENTICAL STRUCTURE ---
    const output = {
      section: {
        id: section._id,
        name: section.name,
        coordinates: section.coordinates
      },

      stations: section.stations.map(s => ({
        id: s._id,
        name: s.name,
        code: s.station_code,   // EXACT SAME
        position: s.position
      })),

      tracks: [],
      trains: []
    };

    // --- TRACKS + BLOCKS ---
    for (const track of section.tracks) {
      const blocks = await Block.find({ track: track._id })
        .populate("signal");

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

    // --- TRAINS ---
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

    // --- SEND AS API RESPONSE ---
    return res.json(output);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};


*/
// controllers/topologyController.js

/**
 * Generate topology JSON compatible with the Vidisha A* simulator
 */
export const getTopologyForSimulator = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // 1) Load section with tracks & blocks
    const section = await Section.findById(sectionId)
      .populate({
        path: "tracks",
        populate: {
          path: "blocks",
          populate: [
            { path: "nextBlocks" },
            { path: "prevBlocks" },
            { path: "signal" }
          ]
        }
      })
      .lean();

    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    // ============================================
    // 2) Build nodes (algorithm needs node graph)
    // ============================================
    let nodeIndex = 0;
    const nodes = {}; // { nodeName: {x,y} }

    function ensureNode(nodeName) {
      if (!nodes[nodeName]) {
        nodes[nodeName] = {
          x: nodeIndex,
          y: 0
        };
        nodeIndex += 1;
      }
      return nodeName;
    }

    // ============================================
    // 3) Build BLOCKS in required format
    // ============================================
    const blocks = {};

    for (const track of section.tracks) {
      for (const b of track.blocks) {
        const startNodeName = ensureNode(`${b.block_id}_START`);
        const endNodeName = ensureNode(`${b.block_id}_END`);

        blocks[b.block_id] = {
          line: track.name,          // UP_MAIN / DN_MAIN / LOOP etc.
          length: b.length,          // <-- FIXED (correct field)
          type: b.type,              // <-- FIXED (correct field)
          start_node: startNodeName,
          end_node: endNodeName
        };
      }
    }

    // ============================================
    // 4) Build SIGNALS for the simulator
    // ============================================
    const signals = {};

    const allSignals = await Signal.find({
      protects_block: {
        $in: Object.values(section.tracks)
          .flatMap(t => t.blocks.map(b => b._id))
      }
    })
      .populate("protects_block")
      .lean();

    for (const s of allSignals) {
      const blockId = s.protects_block?.block_id;

      signals[s.signal_id] = {
        name: s.signal_id,
        node: `${blockId}_END`, // signal placed at end of block
        direction: s.direction,
        type: s.type,
        protects_block: blockId,
        inner_block: s.inner_block ? s.inner_block.toString() : null,
        outer_block: s.outer_block ? s.outer_block.toString() : null,
        follows: s.follows || null,
        aspect: s.aspect || "RED"
      };
    }

    // ============================================
    // 5) Build SWITCHES automatically from graph
    // ============================================
    const switches = {};

    async function detectSwitch(blockId) {
      const block = await Block.findOne({ block_id: blockId })
        .populate("nextBlocks")
        .lean();

      if (block && block.nextBlocks && block.nextBlocks.length > 1) {
        const switchName = `SW_${blockId}`;

        switches[switchName] = {
          name: switchName,
          node: `${blockId}_END`,
          state: `${switchName}_0`,
          branches: block.nextBlocks.map((next, idx) => ({
            name: `${switchName}_${idx}`,
            from_block: blockId,
            to_block: next.block_id
          }))
        };
      }
    }

    for (const blockId of Object.keys(blocks)) {
      await detectSwitch(blockId);
    }

    // ============================================
    // 6) Build final Topology JSON for simulator
    // ============================================
    const topology = {
      station_name: section.name,
      nodes,
      blocks,
      signals,
      switches
    };

    return res.json(topology);

  } catch (err) {
    console.error("Error generating topology:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};



export const getLiveTrainsForSimulator = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // 1) Verify section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    // 2) Fetch all trains inside this section
    const trains = await Train.find({
      current_block: { $ne: null },   // must be in a block
      direction: { $ne: "UNKNOWN" }   // must have direction
    })
      .populate("current_block")
      .lean();

    // 3) Build simulator-compatible train objects
    const trainData = {};

    for (const t of trains) {
      // skip invalid cases
      if (!t.current_block || !t.current_block.block_id) continue;

      trainData[t.train_id] = {
        train_id: t.train_id,
        priority: t.priority || "MED",
        direction: t.direction,
        delay_min: t.delay_min || 0,
        target_line: t.target_line || "BOTH_MAIN",
        current_block: t.current_block.block_id, // IMPORTANT
        speed_blocks_per_step: t.speed_blocks_per_step || 0.2
      };
    }

    return res.json({
      section: section.name,
      total_trains: Object.keys(trainData).length,
      trains: trainData
    });

  } catch (err) {
    console.error("Error loading live trains for simulator:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};