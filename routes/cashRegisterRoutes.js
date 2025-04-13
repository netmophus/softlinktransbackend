import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import {
  openCashRegister,
  closeCashRegister,
  reopenCashRegister,
  getCashRegisters,
 
  addFundsToCashRegister,
  withdrawFunds,
  getCashRegisterTransactions,
} from "../controllers/cashRegisterController.js";

const router = express.Router();

// ✅ 1️⃣ Ouvrir une nouvelle caisse (uniquement pour les superviseurs)
router.post("/open", authenticateUser, authorizeRoles("supervisor"), openCashRegister);


// ✅ Route pour ajouter des fonds à une caisse
router.put("/add-funds/:id", authenticateUser, authorizeRoles("supervisor"), addFundsToCashRegister);

router.put("/withdraw-funds/:id", authenticateUser, authorizeRoles("supervisor"), withdrawFunds);


router.get("/:id/transactions", authenticateUser, authorizeRoles("supervisor"), getCashRegisterTransactions);

// ✅ 2️⃣ Fermer une caisse
router.put("/close/:id", authenticateUser, authorizeRoles("supervisor"), closeCashRegister);

// ✅ 3️⃣ Réouvrir une caisse avec justification
router.put("/reopen/:id", authenticateUser, authorizeRoles("supervisor"), reopenCashRegister);

// ✅ 4️⃣ Récupérer toutes les caisses d’un superviseur
router.get("/", authenticateUser, authorizeRoles("supervisor"), getCashRegisters);



export default router;
