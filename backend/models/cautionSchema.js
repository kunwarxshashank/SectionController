import mongoose from "mongoose";

const CautionSchema = new mongoose.Schema({
    cautionId: {
    type: String,
    required: false
  },
  cautionNumber: {
    type: String,
    required: false
  },
  cautionName: {
    type: String,
    required: false
  },
  cautionDescription: {
    type: String,
    required: false
  },
  sourceStation: {
    type: String,
    required: false
  },
  destinationStation: {
    type: String,
    required: false
  },
  affectedEdges: {
    type: [String],   // array of edge IDs or names
    default: []
  }
});



export default mongoose.model("Caution", CautionSchema);