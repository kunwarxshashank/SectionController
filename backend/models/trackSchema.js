import mongoose from "mongoose";
const TracksSchema = new mongoose.Schema({
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section"
  },
  edges: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Edge"
    }
  ],
  nodes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node"
    }
  ]
});

const Tracks = mongoose.model("Tracks", TracksSchema);
export default Tracks

