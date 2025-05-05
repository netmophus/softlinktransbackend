import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { 
  createInterUserTransfer, 
  getInterUserTransfers, 
  getInterUserTransferById,
  getUserBalance,
  checkUserByPhone,

} from "../controllers/interUserTransferController.js";

const router = express.Router();

// Création d'un transfert entre utilisateurs
router.post("/transfer", authenticateUser, createInterUserTransfer);



// Récupérer l'historique des transferts de l'utilisateur connecté (envoi et réception)
router.get("/transfer/history", authenticateUser, getInterUserTransfers);

// Récupérer les détails d'un transfert spécifique par son ID
router.get("/transfer/:id", authenticateUser, getInterUserTransferById);


// ---- Nouvelle route pour récupérer le solde du user connecté ----
router.get("/balance", authenticateUser, getUserBalance);


// GET /intrausertranfer/check/:phone  -- Vérifie l'existence d'un destinataire par téléphone
router.get("/check/:phone", authenticateUser, checkUserByPhone);



export default router;
