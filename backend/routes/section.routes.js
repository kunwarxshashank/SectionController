import express from "express";
import { /*getSectionDisplay, exportSectionData , */getTopologyForSimulator , getLiveTrainsForSimulator} from "../controllers/sectionDisplay.controller.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

//router.get("/section/:id/display", getSectionDisplay);
//router.get("/section/:id/export", exportSectionData);
router.get("/section/:id/topology", getTopologyForSimulator);
router.get("/section/:id/live-trains", getLiveTrainsForSimulator);

export default router;
