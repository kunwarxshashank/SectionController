import mongoose from "mongoose";

const EdgeSchema = new mongoose.Schema({
  edgeId: String,
  startNode: String,
  endNode: String,
  edgeType: String,
  stream: String,
  signal: String,
  direction: { type: String, enum: ["UNIDIRECTIONAL", "BIDIRECTIONAL"] },
  maxspeed: String,
  crossing: { type: Boolean, default: false },
  restrictions: String
});
export default mongoose.model("Edge", EdgeSchema);
