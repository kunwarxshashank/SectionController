import mongoose from "mongoose";

const StationSchema = new mongoose.Schema({
  station_code: String,
  name: String,
  position: {
    type: [Number],
    index: '2dsphere'
  },

  platforms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform'
  }]
});
const Station = mongoose.model("Station" , StationSchema)

export default Station