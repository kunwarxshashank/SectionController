// models/Track.js
import mongoose from 'mongoose'

const TrackSchema = new mongoose.Schema({
  track_id: String,
  name: String,                   // UP_MAIN, DOWN_MAIN, LOOP_1
  direction: {                    // aka movement direction
    type: String,
    enum: ["UP", "DOWN", "BOTH"],
    default: "UP"
  },

  type: {                         // is it main or loop?
    type: String,
    enum: ["MAIN", "LOOP", "SIDING"],
    default: "MAIN"
  },

  // NEW — To group loops under their main track
  parentTrack: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Track",
    default: null   // null for MAIN tracks
  },

  // NEW — for optimization engines
  isLoop: {
    type: Boolean,
    default: false
  },

  // NEW — OR-Tools can use this to choose best loop
  loopPriority: {
    type: Number,
    default: 1
  },

  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },

  blocks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Block'
  }]
});

const Track = mongoose.model("Track", TrackSchema);
export default Track;
