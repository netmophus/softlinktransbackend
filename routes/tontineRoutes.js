import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { createTontine, enrollMember, findUserByPhone,getTontineCycles,getUserTontineDetails, getMyTontines, payTontineContribution, assignCycleBeneficiary, sendTontineNotification, getActiveTontinesCount,  serveBeneficiary } from "../controllers/tontineController.js";

const router = express.Router();

// ✅ Créer une tontine
router.post("/create", authenticateUser,  authorizeRoles("user"), createTontine);

// ✅ Route pour ajouter un membre à une tontine
router.post("/:tontineId/add-member", authenticateUser,  authorizeRoles("user"), enrollMember);

// ✅ Recherche d'un utilisateur par son numéro de téléphone (accessible aux rôles autorisés)
router.get(
    "/find-by-phone/:phone",
    authenticateUser,
    authorizeRoles("user"), // Permet à plusieurs rôles d'accéder
    findUserByPhone
  );

  
  router.post("/:tontineId/cycles/:cycleId/assign-beneficiary", authenticateUser,  authorizeRoles("user"), assignCycleBeneficiary);


// ✅ Route pour envoyer une notification après ajout
router.post("/:tontineId/send-notification", authenticateUser,  authorizeRoles("user"), sendTontineNotification);


// ✅ Récupérer mes tontines
router.get("/my-tontines", authenticateUser,  authorizeRoles("user"), getMyTontines);

// 🔹 Récupérer les cycles d'une tontine spécifique
router.get("/:tontineId/cycles", authenticateUser,  authorizeRoles("user"), getTontineCycles);


// ✅ Effectuer un paiement de cycle
router.post("/:tontineId/pay", authenticateUser,  authorizeRoles("user"), payTontineContribution);


router.get("/active-count", authenticateUser,  authorizeRoles("user"),  getActiveTontinesCount);


// // ✅ Récupérer les cycles et paiements d'une tontine spécifique
router.get("/:tontineId/my-details", authenticateUser,  authorizeRoles("user"), getUserTontineDetails);


router.post(
  "/:tontineId/cycles/:cycleId/serve",
  authenticateUser,
  authorizeRoles("user"),
  serveBeneficiary
);

export default router;
