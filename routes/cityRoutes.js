import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { createCity, getCities } from "../controllers/cityController.js";

const router = express.Router();

// ✅ Créer une nouvelle ville (ADMIN SEULEMENT)
router.post("/", authenticateUser, authorizeRoles("admin"), createCity);

// ✅ Récupérer la liste des villes
router.get("/", authenticateUser, getCities);

export default router;
