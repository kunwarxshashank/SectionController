import mongoose from "mongoose";

const EdgeSchema = new mongoose.Schema({
  edgeId: String,
  startNode: String,
  endNode: String,
  edgeType: String,
  stream: String,
  signal: String,
  direction: { type: String, enum: ["UNIDIRECTIONAL", "BIDIRECTIONAL" , "UP", "DN"] },
  maxspeed: String,
  crossing: { type: Boolean, default: false },
  restrictions: String,
  
});

const Edge = mongoose.model("Edge", EdgeSchema);
export default Edge
