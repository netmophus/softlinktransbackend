import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { createSupervisor,  getSupervisors, toggleSupervisorStatus} from "../controllers/adminController.js";

const router = express.Router();

router.put("/toggle-supervisor-status/:id", authenticateUser, authorizeRoles("admin"), toggleSupervisorStatus);


// Route pour récupérer les superviseurs
router.get("/supervisors", authenticateUser, authorizeRoles("admin"), getSupervisors);


// ✅ Route pour créer un superviseur (Seul l'administrateur peut le faire)
router.post("/create-supervisor", authenticateUser, authorizeRoles("admin"), createSupervisor);

// ✅ Route pour activer un superviseur (Seul l'administrateur peut activer un compte)
// router.put("/activate-supervisor/:id", authenticateUser, authorizeRoles("admin"), activateSupervisor);

export default router;
