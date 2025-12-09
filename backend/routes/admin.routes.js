import express from "express";
import { loginAdmin, refreshAccessToken } from "../controllers/adminAuth.controller.js";

const router = express.Router();

router.post("/admin/login", loginAdmin);
router.post("/admin/refresh", refreshAccessToken);

export default router;
