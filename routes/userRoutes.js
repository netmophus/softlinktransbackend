import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { createInterCityTransfer, getUserInterCityTransfers } from "../controllers/userController.js";

const router = express.Router();
router.post("/intercitytransfer", authenticateUser, authorizeRoles("user"), createInterCityTransfer);



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


// Fichier : routes/intercityRoutes.js (ou userRoutes.js selon ta structure)
router.get("/transfer/history", authenticateUser, authorizeRoles("user"), getUserInterCityTransfers);


export default router;
