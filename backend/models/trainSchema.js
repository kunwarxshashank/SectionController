import mongoose from "mongoose";

// Schedule for each station in the section
const stationScheduleSchema = new mongoose.Schema({
  scheduledArrival: { type: String, default: "" },
  scheduledDeparture: { type: String, default: "" },
  actualArrival: { type: String, default: "" },
  actualDeparture: { type: String, default: "" },
  expectedDeparture: { type: String, default: "" }
}, { _id: false });

// Schedule contains all stations in our section (Bhopal, Vidisha, Bina)
const scheduleSchema = new mongoose.Schema({
  bhopal: { type: stationScheduleSchema, default: () => ({}) },
  vidisha: { type: stationScheduleSchema, default: () => ({}) },
  bina: { type: stationScheduleSchema, default: () => ({}) }
}, { _id: false });

const trainSchema = new mongoose.Schema({
  trainId: { type: String, required: true, unique: true },
  trainName: { type: String, required: true },
  trainType: { type: String, required: true },
  trainCategory: { type: String, enum: ["Passenger", "Freight", "Special"], required: true },

  // Priority (lower = higher priority)
  basePriority: { type: Number, required: true },
  trainPriority: { type: Number, required: true },

  // Train specifications
  maxTrainCapacity: { type: Number, required: true },
  maxSpeed: { type: Number, required: true },

  // Current position on track
  currentEdge: { type: String, default: "" },
  
  // Direction of travel
  direction: { type: String, enum: ["UP", "DOWN"], required: true },
  
  // Emergency flag
  isEmergency: { type: Boolean, default: false },

  // Station-wise schedule
  schedule: { type: scheduleSchema, required: true }
}, { timestamps: true });

export default mongoose.model("Train", trainSchema);
