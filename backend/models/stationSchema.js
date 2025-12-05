import mongoose from "mongoose";

const StationSchema = new mongoose.Schema({
  stationId: String,
  stationName: String,

  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section"
  },

  totalTracks: {
    type: Map,
    of: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Edge"
      }
    ],
    default: {}
  },

  nodes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node"
    }
  ],

  locoPilot: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocoPilot"
    }
  ]
});

const Station = mongoose.model("Station", StationSchema);
export default Station
