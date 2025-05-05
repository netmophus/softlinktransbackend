import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { createCashier, getCashiers, getSupervisorInfo, getClosingReports,toggleCashierStatus, getDailyReports, getClosingReportDetails } from "../controllers/supervisorController.js";

const router = express.Router();

// 🔹 Création d'un caissier (uniquement pour les superviseurs)
router.post("/create-cashier", authenticateUser, authorizeRoles("supervisor"), createCashier);



// ✅ Récupérer la liste des caissiers sous la supervision du superviseur
router.get("/cashiers", authenticateUser, authorizeRoles("supervisor"), getCashiers);

// ✅ Activer/désactiver un caissier (TOGGLE)
router.put("/toggle-cashier/:id", authenticateUser, authorizeRoles("supervisor"), toggleCashierStatus);


// Route pour récupérer les infos du superviseur connecté
router.get("/me", authenticateUser, authorizeRoles("supervisor"), getSupervisorInfo);


router.get("/daily-reports", authenticateUser, authorizeRoles("supervisor"), getDailyReports);

router.get(
    "/reports/closing/:reportId",
    authenticateUser,
    authorizeRoles("supervisor"),
    getClosingReportDetails // (voir réponse précédente)
  );
// 🔥 Seuls les superviseurs peuvent accéder à ce rapport
router.get("/reports/closing", authenticateUser, authorizeRoles("supervisor"), getClosingReports);




  

export default router;
