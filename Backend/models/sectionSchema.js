import mongoose from 'mongoose'

const SectionSchema = new mongoose.Schema({
  section_id: String,
  name: String,

  coordinates: {
    type: [Number],
    index: "2dsphere"
  },

  tracks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track'
  }],

  upSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  downSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },

  stations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  }]
});

const Section = mongoose.model("Section", SectionSchema);
export default Section;