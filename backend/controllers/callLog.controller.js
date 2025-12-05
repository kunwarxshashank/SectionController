import CallLog from "../models/callLogSchema.js";

// Create a new call log
export const createCallLog = async (req, res) => {
    try {
        const {
            callId,
            callerId,
            callerSectionId,
            calleeName,
            calleeSectionId,
            callType,
            startTime,
            endTime,
            duration,
            transcript,
            transcriptSegments,
            status
        } = req.body;

        const callLog = new CallLog({
            callId,
            callerId,
            callerSectionId,
            calleeName,
            calleeSectionId,
            callType,
            startTime: new Date(startTime),
            endTime: endTime ? new Date(endTime) : null,
            duration,
            transcript,
            transcriptSegments: transcriptSegments || [],
            status: status || "completed"
        });

        await callLog.save();

        res.status(201).json({
            success: true,
            message: "Call log created successfully",
            data: callLog
        });
    } catch (error) {
        console.error("Error creating call log:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create call log",
            error: error.message
        });
    }
};

// Get call logs with pagination and filters
export const getCallLogs = async (req, res) => {
    try {
        const {
            callerId,
            calleeName,
            from,
            to,
            page = 1,
            limit = 20,
            status
        } = req.query;

        const filter = {};

        if (callerId) {
            filter.callerId = callerId;
        }

        if (calleeName) {
            filter.calleeName = calleeName;
        }

        if (status) {
            filter.status = status;
        }

        // Date range filter
        if (from || to) {
            filter.startTime = {};
            if (from) filter.startTime.$gte = new Date(from);
            if (to) filter.startTime.$lte = new Date(to);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [callLogs, total] = await Promise.all([
            CallLog.find(filter)
                .sort({ startTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            CallLog.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: callLogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error("Error fetching call logs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch call logs",
            error: error.message
        });
    }
};

// Get call log by ID
export const getCallLogById = async (req, res) => {
    try {
        const { id } = req.params;

        const callLog = await CallLog.findById(id);

        if (!callLog) {
            return res.status(404).json({
                success: false,
                message: "Call log not found"
            });
        }

        res.json({
            success: true,
            data: callLog
        });
    } catch (error) {
        console.error("Error fetching call log:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch call log",
            error: error.message
        });
    }
};

// Get call logs for a specific user (both as caller and callee)
export const getUserCallLogs = async (req, res) => {
    try {
        const { email } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const filter = {
            $or: [{ callerId: email }, { calleeName: email }]
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [callLogs, total] = await Promise.all([
            CallLog.find(filter)
                .sort({ startTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            CallLog.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: callLogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error("Error fetching user call logs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user call logs",
            error: error.message
        });
    }
};
