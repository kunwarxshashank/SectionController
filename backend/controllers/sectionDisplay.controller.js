// controllers/sectionDisplay.controller.js

import Section from "../models/sectionSchema.js";
import Track from "../models/trackSchema.js";
import Block from "../models/blockSchema.js";
import Signal from "../models/signalSchema.js";
import Station from "../models/stationSchema.js";
import Train from "../models/trainSchema.js";

export const getSectionDisplay = async (req, res) => {
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
