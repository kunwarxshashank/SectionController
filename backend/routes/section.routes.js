import express from "express";
import { getSectionDisplay } from "../controllers/sectionDisplay.controller.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

router.get("/section/:id/display", getSectionDisplay);

export default router;
