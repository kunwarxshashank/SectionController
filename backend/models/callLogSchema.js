import mongoose from "mongoose";

const CallLogSchema = new mongoose.Schema(
    {
        callId: {
            type: String,
            required: true,
            unique: true
        },

        // Caller (person who made or received the call from this device)
        callerId: {
            type: String,
            required: true
        },
        callerSectionId: {
            type: String,
            required: true
        },

        // Callee (other party)
        calleeName: {
            type: String,
            required: true
        },
        calleeSectionId: {
            type: String,
            default: null
        },

        // Call metadata
        callType: {
            type: String,
            enum: ["outgoing", "incoming"],
            required: true
        },

        startTime: {
            type: Date,
            required: true
        },

        endTime: {
            type: Date,
            default: null
        },

        duration: {
            type: Number, // in seconds
            default: 0
        },

        // Transcription data
        transcript: {
            type: String,
            default: ""
        },

        transcriptSegments: [
            {
                text: {
                    type: String,
                    required: true
                },
                timestamp: {
                    type: Date,
                    required: true
                },
                speaker: {
                    type: String,
                    default: "local" // local user or could identify speaker if both sides transcribed
                }
            }
        ],

        // Status
        status: {
            type: String,
            enum: ["completed", "missed", "rejected"],
            default: "completed"
        }
    },
    {
        timestamps: true
    }
);

// Indexes for efficient querying
CallLogSchema.index({ callerId: 1, createdAt: -1 });
CallLogSchema.index({ calleeName: 1, createdAt: -1 });
CallLogSchema.index({ startTime: -1 });

const CallLog = mongoose.model("CallLog", CallLogSchema);
export default CallLog;
