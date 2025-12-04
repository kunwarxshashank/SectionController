const NodeSchema = new mongoose.Schema({
  nodeId: String,
  nodeType: {
    type: String,
    enum: [
      "signalHome",
      "signalAdvance",
      "signalStarter",
      "signalAutomatic",
      "track_node",
      "switch",
      "platform",
      "sectionStart",
      "sectionEnd",
      "stationStart",
      "stationEnd",
      "loopStart",
      "loopEnd",
      "loopCorner",
      "turningPoint",
      "junction"
    ]
  },
  x: Number,
  y: Number,
  name: String,
  line: String,
  description: String,
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },
  signalColor: {
    type: String,
    enum: ["red", "yellow", "doubleYellow", "green"]
  },
  signalType: {
    type: String,
    enum: [
      "signalHome",
      "signalAdvance",
      "signalStarter",
      "signalAutomatic",
      "manual",
      "automatic"
    ]
  }
});
export default mongoose.model("Node", NodeSchema);
