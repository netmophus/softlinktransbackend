import express from "express";
import { getCommissionConfig } from "../controllers/configController.js";

const router = express.Router();

router.get("/fees", getCommissionConfig); // → /config/fees

export default router;
