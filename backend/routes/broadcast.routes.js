import express from "express";
import Admin from "../models/adminSchema.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get all admins with their sections (for directory)
router.get("/broadcast/admins", verifyJWT, async (req, res) => {
    try {
        const admins = await Admin.find()
            .select("email sectionId lastLogin")
            .lean();

        res.json({
            success: true,
            data: admins
        });
    } catch (error) {
        console.error("Error fetching admins:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch admin directory"
        });
    }
});

// Get current admin details
router.get("/broadcast/me", verifyJWT, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id)
            .select("email sectionId");

        res.json({
            success: true,
            data: admin
        });
    } catch (error) {
        console.error("Error fetching current admin:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch admin details"
        });
    }
});

export default router;
