import express from "express";
import { authenticateUser, logoutUser} from "../middleware/auth.js";
import authController from "../controllers/authController.js";

const router = express.Router();

// Route d'inscription
router.post("/register", authController.register);

// Route de connexion
router.post("/login", authController.login);

// Vérification de l'OTP
router.post("/verify-otp", authController.verifyOTP);

router.post('/verify-reset-otp', authController.verifyResetOtp);


router.post("/verify-password", authenticateUser, authController.verifyPassword);


// routes/authRoutes.js
router.post('/request-reset-password', authController.requestResetPassword);



// Validation PIN
router.post("/verify-pin", authController.verifyPIN); // 🔑 Nouvelle route pour valider le PIN

router.post("/reset-pin", authController.resetPIN);

// Route pour changer le PIN
router.post("/change-pin", authController.changePIN);


router.post("/resend-otp",  authController.resendOTP); // ✅ nouvelle route


// Déconnexion sécurisée
router.post("/logout", authenticateUser, logoutUser);


// ✅ Route pour récupérer l'utilisateur connecté
router.get("/me", authenticateUser, authController.getAuthenticatedUser);





export default router;




