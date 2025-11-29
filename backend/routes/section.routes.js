import express from "express";
import { getSectionDisplay, exportSectionData } from "../controllers/sectionDisplay.controller.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

router.get("/section/:id/display", getSectionDisplay);
router.get("/section/:id/export", exportSectionData);

export default router;
