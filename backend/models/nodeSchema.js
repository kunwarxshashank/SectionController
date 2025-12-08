import mongoose from "mongoose";

const NodeSchema = new mongoose.Schema({
  nodeId: String,

  nodeType: { type: String , enum: ["main" , "loop" , "crossing"   , ], default:"signal"}, // keep as-is

  x: Number,
  y: Number,
 line: String,

  signalColor: {
    type: String,
    enum: ["red", "yellow", "doubleYellow", "green"],
    default:"green",
  },

  signalType: {
    type: String,
    enum: ["home", "starter", "automatic", "advance"],
    default:"home",
  },

  // NEW FIELD
  blockBoundary: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model("Node", NodeSchema);
