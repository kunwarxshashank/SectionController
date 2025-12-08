import mongoose from "mongoose";

const EdgeSchema = new mongoose.Schema({
  edgeId: String,
  startNode: String,
  endNode: String,
  edgeType: { type: String, enum: ["loop", "block", "automatic", "crossing"], default: "automatic" },
  stream: String,
  isOccupied: { type: Boolean, default: false },
  direction: { type: String, enum: ["BOTH", "UP", "DOWN"] },
  maxspeed: String,
  crossing: { type: Boolean, default: false },
  restrictions: String,
  length: Number,
  stationCode:{type:String, default:""},
  loopGroup:{type:String, default:""},
  loopNumber:{type:Number, default:0},
});

const Edge = mongoose.model("Edge", EdgeSchema);
export default Edge
