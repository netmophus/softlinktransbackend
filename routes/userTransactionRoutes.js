import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import {  getUserTransfers } from "../controllers/userTransactionController.js";
import { authorizeRoles } from "../middleware/role.js";

const router = express.Router();

// // ✅ Route pour effectuer un transfert entre utilisateurs
// router.post("/usertransfer", authenticateUser, authorizeRoles("user"), transferBetweenUsers);

// ✅ Route pour récupérer l'historique des transferts d'un utilisateur (DUPLICATION)
router.get("/user-transfers", authenticateUser, authorizeRoles("user"), getUserTransfers);



export default router;
