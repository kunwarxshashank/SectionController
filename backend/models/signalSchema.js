import mongoose from "mongoose";

const SignalSchema = new mongoose.Schema({
  signal_id: String,
  block: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Block'
  },
  position: {
    type: [Number],
    index: '2dsphere'
  },
  aspect: {
    type: String,
    enum: ['RED', 'YELLOW', 'GREEN']
  }
});

const Signal = mongoose.model("Signal", SignalSchema);
export default Signal