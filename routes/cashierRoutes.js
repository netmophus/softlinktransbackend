import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import {getPendingTransfers,cancelTransfer, payTransfer, getTotalInterCityTransfers, getInterCityTransfersHistory,  calculateFeesController,checkSenderController,  depositForUser, withdrawForUser, getCashierTransactions, getCashRegisterDetails,getDepositsHistory, getWithdrawalsHistory, getTotalDepositsWithdrawals, createInterCityTransfer, findUserByPhone } from "../controllers/cashierController.js";

const router = express.Router();

// ✅ Effectuer un dépôt pour un utilisateur
router.post("/deposit", authenticateUser, authorizeRoles("cashier"), depositForUser);



// ✅ Effectuer un retrait pour un utilisateur
router.post("/withdraw", authenticateUser, authorizeRoles("cashier"), withdrawForUser);


router.get("/find-by-phone/:phone",  authenticateUser, authorizeRoles("cashier"), findUserByPhone);

// ✅ Voir l'historique des transactions du caissier
router.get("/transactions", authenticateUser, authorizeRoles("cashier"), getCashierTransactions);


// ✅ Route pour obtenir le total des dépôts et retraits
router.get("/total-transactions", authenticateUser, authorizeRoles("cashier"), getTotalDepositsWithdrawals);



// ✅ Récupérer le solde, le total dépôt et total retrait
router.get("/cash-register", authenticateUser, authorizeRoles("cashier"), getCashRegisterDetails);

// ✅ Récupérer l’historique des dépôts
router.get("/history/deposits", authenticateUser, authorizeRoles("cashier"), getDepositsHistory);

// ✅ Récupérer l’historique des retraits
router.get("/history/withdrawals", authenticateUser, authorizeRoles("cashier"), getWithdrawalsHistory);

// ✅ Effectuer un transfert interville
//router.post("/inter-city-transfer", authenticateUser, authorizeRoles("cashier"), createInterCityTransfer);

router.post("/inter-city-transfer", authenticateUser, authorizeRoles("user", "cashier"), createInterCityTransfer);

router.get("/total-intercity-transfers", authenticateUser,  authorizeRoles("cashier"), getTotalInterCityTransfers);

router.get("/history/intercity", authenticateUser, authorizeRoles("cashier"), getInterCityTransfersHistory);

// ✅ Route pour calculer les frais
router.post("/calculate-fees", calculateFeesController);


router.get("/check-sender/:phone", checkSenderController);

// ✅ Récupérer tous les transferts en attente
router.get("/pending-transfers", authenticateUser, authorizeRoles("cashier"), getPendingTransfers);

// ✅ Payer un transfert et changer son statut en "completed"
router.post("/pay-transfer/:id", authenticateUser, authorizeRoles("cashier"), payTransfer);

// ✅ Annuler un transfert et changer son statut en "cancelled"
router.put("/cancel-transfer/:id", authenticateUser, authorizeRoles("cashier"), cancelTransfer);




export default router;
