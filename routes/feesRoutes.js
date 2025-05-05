import express from "express";
import { getFees } from "../controllers/feesController.js";

const router = express.Router();

router.post("/calculate", getFees); // 📩 On envoie { amount }

export default router;
