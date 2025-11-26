

import mongoose from "mongoose";

const LogSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true
    },

    trainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Train",
      default: null
    },

    action: {
      type: String,
      enum: [
        "HOLD",
        "DIVERT",
        "SPEED_ADVISORY",
        "APPROVE",
        "REJECT",
        "ENTER_BLOCK",
        "LEAVE_BLOCK",
        "SYSTEM_SUGGESTION",
        "SYSTEM_OVERRIDE"
      ],
      
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null // null = automated system action
    },

    oldState: {
      type: Object,
      default: {}
    },

    newState: {
      type: Object,
      default: {}
    },

    message: {
      type: String,
      
    }
  },
  {
    timestamps: true // creates createdAt & updatedAt
  }
);

const Log = mongoose.model("Log", LogSchema);
export default Log;
