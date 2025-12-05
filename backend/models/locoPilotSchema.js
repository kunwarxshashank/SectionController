import mongoose from "mongoose";

const LocoPilotSchema = new mongoose.Schema({
  locopilotId: {
    type: String,
    required: false
  },
  locopilotName: {
    type: String,
    required: false
  },

  dutyStartTime: {
    type: String,   // you can change to Date later
    required: false
  },

  dutyEndTime: {
    type: String,   // you can change to Date later
    required: false
  },

  overtime: {
    type: String,
    required: false
  },

  currentTrain: {
    type: String,   // trainId or trainName
    required: false
  },

  compatibleTrains: {
    type: [String], // array is better than a single string
    default: []
  },

  startingStation: {
    type: String,
    required: false
  },

  endingStation: {
    type: String,
    required: false
  }

}, { timestamps: true });

export default mongoose.model("LocoPilot", LocoPilotSchema);
