// models/Train.js
import mongoose from "mongoose";

const TrainPerfSchema = new mongoose.Schema({
  maxSpeedKmph: { type: Number, default: 100 },
  accelMps2: { type: Number, default: 0.6 },
  decelMps2: { type: Number, default: 0.7 },
  lengthM: { type: Number, default: 200 }
}, { _id: false });

const TrainSchema = new mongoose.Schema({
  name: { type: String, required: true },           // human readable
  number: { type: String, required: true, unique: true }, // train code/id

  // static characteristics
  type: { type: String, enum: ["PASSENGER","EXPRESS","FREIGHT","LOCAL"], default: "EXPRESS" },
  perf: { type: TrainPerfSchema, default: () => ({}) },

  // routing & schedule
  plannedRoute: [{ type: mongoose.Schema.Types.ObjectId, ref: "Block" }], // optional list of block ids
  homeSection: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },

  // live state (updated frequently)
  currentSection: { type: mongoose.Schema.Types.ObjectId, ref: "Section", index: true, default: null },
  current_block: { type: mongoose.Schema.Types.ObjectId, ref: "Block", index: true, default: null },
  offset_m: { type: Number, default: 0 },           // offset inside current block
  lat: { type: Number, default: null },
  lon: { type: Number, default: null },
  speed_kmph: { type: Number, default: 0 },
  direction: { type: String, enum: ["UP","DOWN","UNKNOWN"], default: "UNKNOWN" },

  // operational
  priority: { type: Number, default: 1 },           // bigger = more important
  delay_min: { type: Number, default: 0 },          // positive = delayed
  status: { type: String, enum: ["RUNNING","STOPPED","AT_STATION","OUT_OF_SECTION"], default: "OUT_OF_SECTION" },

  // metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for fast queries
TrainSchema.index({ currentSection: 1, priority: -1 });
TrainSchema.index({ current_block: 1 });

// helper method to update live position (keeps updatedAt)
TrainSchema.methods.updatePosition = function ({ blockId, offset_m, lat, lon, speed_kmph, delay_min, status }) {
  if (blockId !== undefined) this.current_block = blockId;
  if (offset_m !== undefined) this.offset_m = offset_m;
  if (lat !== undefined) this.lat = lat;
  if (lon !== undefined) this.lon = lon;
  if (speed_kmph !== undefined) this.speed_kmph = speed_kmph;
  if (delay_min !== undefined) this.delay_min = delay_min;
  if (status !== undefined) this.status = status;
  this.updatedAt = new Date();
  return this.save();
};

const Train = mongoose.model("Train", TrainSchema);
export default Train;
