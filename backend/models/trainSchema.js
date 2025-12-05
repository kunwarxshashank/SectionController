// models/Train.js
import mongoose from "mongoose";

const TrainSchema = new mongoose.Schema({
  train_id: String,
  name: String,

  priority: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: ["local", "express", "special"],
    default: "local"
  },
  averageSpeed: {
    type: Number,
    default: 0
  },
  maxSpeed: {
    type: Number,
    default: 0
  },

  scheduleTime: [
    {
      arrivalTime: { type: Date },
      departureTime: { type: Date },
      station: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Station"
      }
    }
  ],

  actualTime: [
    {
      arrivalTime: { type: Date },
      departureTime: { type: Date },
      station: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Station"
      }
    }
  ],
  expectedDeparture: [
    {
      arrivalTime: { type: Date },
      departureTime: { type: Date },
      station: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Station"
      }
    }
  ],

  category: {
    type: String,
    enum: ["diesel", "electric"],
    default: "electric"
  },

  direction: {
    type: String,
    enum: ["UP", "DN"],
    required: true
  },
  current_edge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Edge",
    default: null
  },

  Axels: {
    type: Number,
    default: 0
  },

  current_Speed: {
    type: Number,
    default: 0
  },

  current_stream: {
    type: String,
    enum: ["UP", "DN"],
    default: "UP"
  },

  isEmergency: {
    type: Boolean,
    default: false
  },
  PAD: {
    type: Number,
    default: 0
  },
  PDD: {
    type: Number,
    default: 0
  },
  locoPilot: {
    type: Boolean,
    default: false
  },
  speed_blocks_per_step: { type: Number, default: 0.2 },

  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Station"
  }
});

export default mongoose.model("Train", TrainSchema);
