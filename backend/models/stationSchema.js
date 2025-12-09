import mongoose from "mongoose";

const StationSchema = new mongoose.Schema({
  stationId: String,
  stationName: String,

  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section"
  },

  startNode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Node"
  },

  endNode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Node"
  },

  
});

const Station = mongoose.model("Station", StationSchema);
export default Station
