import express from "express";
import { getAllCommissions, getCommissionById, getGlobalCommissionsReport } from "../controllers/commissionsController.js";
import { authenticateUser } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";



const router = express.Router();

// Récupérer toutes les commissions (admin seulement)
router.get("/", authenticateUser, authorizeRoles("admin"), getAllCommissions);

// Détail d’une commission par ID (admin seulement)
router.get("/:id", authenticateUser, authorizeRoles("admin"), getCommissionById);

// // Reporting agrégé par ville/période/type (admin)
// router.get("/report/global", authenticateUser, authorizeRoles("admin"), getCommissionsReport);


router.get("/reports/global", authenticateUser, authorizeRoles("admin"), getGlobalCommissionsReport);



export default router;
