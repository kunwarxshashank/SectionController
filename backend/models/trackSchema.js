const TracksSchema = new mongoose.Schema({
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section"
  },
  edges: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Edge"
    }
  ],
  nodes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node"
    }
  ]
});

export default mongoose.model("Tracks", TracksSchema);
