import express from "express";
import {
  createIdentification,
  getMyIdentification,
  getAllIdentifications,
  updateIdentificationStatus,
} from "../controllers/identificationController.js";

import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// ➕ Création d’un dossier d’identification
router.post("/", authenticateUser, createIdentification);

// 🔍 Voir son propre dossier
router.get("/me", authenticateUser, getMyIdentification);

// 📋 Admin - Voir tous les dossiers
router.get("/", authenticateUser, getAllIdentifications);

// ✅ Admin - Changer statut (valider ou rejeter)
router.put("/:id/status", authenticateUser, updateIdentificationStatus);

export default router;

