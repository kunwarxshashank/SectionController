import express from "express";
import {
  createOrUpdateStationLayout,
  getStationLayout
} from "../controllers/stationLayout.controller.js";

const router = express.Router();

// Save or update layout
router.post("/station-layout", createOrUpdateStationLayout);

// Get layout
router.get("/station-layout/:station_name", getStationLayout);

export default router;
