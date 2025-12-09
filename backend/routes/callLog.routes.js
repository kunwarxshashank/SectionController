import express from "express";
import {
    createCallLog,
    getCallLogs,
    getCallLogById,
    getUserCallLogs
} from "../controllers/callLog.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

// Create a new call log
router.post("/call-logs", verifyJWT, createCallLog);

// Get call logs with filters
router.get("/call-logs", verifyJWT, getCallLogs);

// Get a specific call log by ID
router.get("/call-logs/:id", verifyJWT, getCallLogById);

// Get call logs for a specific user
router.get("/call-logs/user/:email", verifyJWT, getUserCallLogs);

export default router;
