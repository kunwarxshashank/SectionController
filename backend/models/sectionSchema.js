import mongoose from "mongoose";
const SectionSchema = new mongoose.Schema({
  section_id: String,
  name: String,

  tracks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tracks"
    }
  ],

  stations: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    }
  ]
});
export default mongoose.model("Section", SectionSchema);
