// models/Block.js
import mongoose from 'mongoose'

const BlockSchema = new mongoose.Schema({
  block_id: String,
  index: Number,
  length_m: Number,
  max_speed_kmph: Number,

  // NEW — block classification
  blockType: {
    type: String,
    enum: ["MAIN", "LOOP", "SIDING"],
    default: "MAIN"
  },

  // NEW — link block to loop track (useful for overtakes)
  loopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Track",
    default: null
  },

  // NEW — helps OR-Tools determine direction
  trackDirection: {
    type: String,
    enum: ["UP", "DOWN", "BOTH"],
    default: "UP"
  },

  // NEW — safety headway (OR-Tools uses this)
  headwaySeconds: {
    type: Number,
    default: 180   // 3 minutes default
  },

  track: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track'
  },

  geometry: {
    type: { type: String, enum: ['LineString'], default: 'LineString' },
    coordinates: [[Number]]
  },

  nextBlocks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Block'
  }],
  prevBlocks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Block'
  }],

  signal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Signal'
  }
});

const Block = mongoose.model("Block", BlockSchema);
export default Block;
