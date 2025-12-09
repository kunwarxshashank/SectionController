// controllers/log.controller.js

import Log from "../models/logsSchema.js";

// ------------------------------------
// CREATE / STORE A LOG ENTRY
// ------------------------------------
export const addLog = async (req, res) => {
  try {
    const {
      sectionId,
      trainId = null,
      action,
      performedBy = null,
      message,
      oldState = {},
      newState = {}
    } = req.body;

    // Validation
    if (!sectionId || !action || !message) {
      return res.status(400).json({
        msg: "sectionId, action, and message are required fields."
      });
    }

    const logEntry = await Log.create({
      sectionId,
      trainId,
      action,
      performedBy,
      message,
      oldState,
      newState
    });

    res.status(201).json({
      msg: "Log saved successfully",
      log: logEntry
    });

  } catch (error) {
    console.error("Error adding log:", error);
    res.status(500).json({ msg: "Server error" });
  }
};



// ------------------------------------
// FETCH LOGS WITH FILTERS
// (Works for all logs)
// ------------------------------------
export const fetchLogs = async (req, res) => {
  try {
    const { sectionId, trainId, action, from, to, page = 1, limit = 50 } = req.query;

    const filter = {};

    // Apply filters
    if (sectionId) filter.sectionId = sectionId;
    if (trainId) filter.trainId = trainId;
    if (action) filter.action = action;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    // Pagination calculation
    const skip = (page - 1) * limit;

    const logs = await Log.find(filter)
      .populate("performedBy", "email")
      .populate("trainId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalLogs = await Log.countDocuments(filter);

    res.json({
      page: Number(page),
      totalPages: Math.ceil(totalLogs / limit),
      totalLogs,
      logs
    });

  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ msg: "Server error" });
  }
};



// ------------------------------------
// GET LOGS FOR A SPECIFIC SECTION
// ------------------------------------
export const fetchSectionLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await Log.find({ sectionId: id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ logs });

  } catch (error) {
    console.error("Error fetching section logs:", error);
    res.status(500).json({ msg: "Server error" });
  }
};



// ------------------------------------
// GET LOGS FOR A SPECIFIC TRAIN
// ------------------------------------
export const fetchTrainLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await Log.find({ trainId: id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ logs });

  } catch (error) {
    console.error("Error fetching train logs:", error);
    res.status(500).json({ msg: "Server error" });
  }
};



// ------------------------------------
// GET LOGS BY ACTION TYPE (e.g. HOLD, DIVERT)
// ------------------------------------
export const fetchLogsByAction = async (req, res) => {
  try {
    const { action } = req.params;

    const logs = await Log.find({ action })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ logs });

  } catch (error) {
    console.error("Error fetching logs by action:", error);
    res.status(500).json({ msg: "Server error" });
  }
};
