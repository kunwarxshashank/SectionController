import mongoose from "mongoose";

const stationScheduleSchema = new mongoose.Schema({
  scheduledArrival: { type: String, default: "" },
  scheduledDeparture: { type: String, default: "" },
  actualArrival: { type: String, default: "" },
  actualDeparture: { type: String, default: "" },
  expectedDeparture: { type: String, default: "" }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  vidisha: { type: stationScheduleSchema, default: () => ({}) },
  sorai: { type: stationScheduleSchema, default: () => ({}) },
  sumer: { type: stationScheduleSchema, default: () => ({}) },
  gulabganj: { type: stationScheduleSchema, default: () => ({}) },
  pabai: { type: stationScheduleSchema, default: () => ({}) },
  ganjbasoda: { type: stationScheduleSchema, default: () => ({}) }
}, { _id: false });

const trainSchema = new mongoose.Schema({
  trainId: { type: String, required: true, unique: true },
  trainNumber: { type: String, required: true },
  trainName: { type: String, required: true },
  trainType: { type: String, required: true },
  trainCategory: { type: String, required: true },

  basePriority: { type: Number, required: true },
  trainPriority: { type: Number, required: true },

  currentTrainPassenger: { type: Number, required: true },
  maxTrainCapacity: { type: Number, required: true },

  currentEdge: { type: String, default: "" },
  isEmergency: { type: Boolean, default: false },

  PAD: { type: [String], default: [] },
  PDD: { type: [String], default: [] },
  ACP: { type: [String], default: [] },

  numberOfAxle: { type: Number, required: true },
  direction: { type: String, required: true },
  maxSpeed: { type: Number, required: true },

  schedule: { type: scheduleSchema, required: true }
}, { timestamps: true });

export default mongoose.model("Train", trainSchema);
