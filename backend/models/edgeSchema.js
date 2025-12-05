import mongoose from "mongoose";

const EdgeSchema = new mongoose.Schema({
  edgeId: String,
  startNode: String,
  endNode: String,
  edgeType: String,
  stream: { type: String, enum: ["UP", "DN", "BIDIRECTIONAL"] },
  signal: String,
  direction: { type: String, enum: ["UP", "DN"] },
  maxspeed: String,
  crossing: { type: Boolean, default: false },
  restrictions: String
});
export default mongoose.model("Edge", EdgeSchema);
