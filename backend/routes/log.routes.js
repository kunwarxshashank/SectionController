import express from "express";
import {
  addLog,
  fetchLogs,
  fetchSectionLogs,
  fetchTrainLogs,
  fetchLogsByAction
} from "../controllers/log.controller.js";
import {verifyAdmin} from "../middleware/verifyAdmin.js";

const router = express.Router();

router.post("/log", verifyAdmin ,addLog);

router.get("/logs",verifyAdmin, fetchLogs);                           // ?sectionId=&trainId=&action=&from=&to=&page=&limit=
router.get("/logs/section/:id", verifyAdmin,fetchSectionLogs);        // logs of a section
router.get("/logs/train/:id", verifyAdmin,fetchTrainLogs);            // logs of a train
router.get("/logs/action/:action", verifyAdmin,fetchLogsByAction);    // logs of single action type

export default router;
