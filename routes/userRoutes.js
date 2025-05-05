



import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import {
  createInterCityTransfer,
  getUserInterCityTransfers,
  updateInterCityTransfer,     // 🔥 (nouvelle version renommée)
  cancelInterCityTransfer,     // 🔥 (pour l'annulation simple)
  autoRefundInterCityTransfer, // 🔥 ("me renvoyer à moi-même")
  
} from "../controllers/userController.js";
import User from "../models/User.js";

const router = express.Router();

// ✅ Création d'un transfert interville par un utilisateur mobile
router.post(
  "/intercitytransfer",
  authenticateUser,
  authorizeRoles("user"),
  createInterCityTransfer
);

// ✅ Récupération du solde virtuel d'un utilisateur
router.get("/user/:id/balance", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non trouvé." });
    }
    res.json({ balance: user.virtualAccount.balance });
  } catch (error) {
    console.error("Erreur lors de la récupération du solde :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
});

// ✅ Historique des transferts pour l'utilisateur connecté
router.get(
  "/transfer/history",
  authenticateUser,
  authorizeRoles("user"),
  getUserInterCityTransfers
);

// ✅ Modification de la ville de retrait (ou autres champs) d’un transfert (avant retrait)
router.put(
  "/transfer/update/:transferId",
  authenticateUser,
  authorizeRoles("user"),
  updateInterCityTransfer // <-- c'est bien la fonction qui gère l'impact caisse
);

// ✅ Annulation classique d’un transfert (avant retrait)
router.post(
  "/transfer/cancel/:transferId",
  authenticateUser,
  authorizeRoles("user"),
  cancelInterCityTransfer
);

// ✅ Reversement automatique ("me renvoyer à moi-même" depuis l’app mobile)
router.post(
  "/transfer/refund/:transferId",
  authenticateUser,
  authorizeRoles("user"),
  autoRefundInterCityTransfer
);



export default router;
