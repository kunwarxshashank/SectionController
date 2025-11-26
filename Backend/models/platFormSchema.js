import mongoose from 'mongoose'

const PlatformSchema = new mongoose.Schema({
  number: Number,
  length_m: Number,
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  },

  // blocks touching the platform
  blocks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Block'
  }]
});


const Platform = mongoose.model("Platform", PlatformSchema);

export default Platform
