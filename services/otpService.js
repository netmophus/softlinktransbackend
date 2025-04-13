import crypto from "crypto";
import User from "../models/User.js";
import { sendSMS } from "./smsService.js"; // Service d'envoi de SMS
import { sendEmail } from "./emailService.js"; // Service d'envoi d'email

// ✅ **Génération d'un OTP sécurisé**
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString(); // Génère un OTP à 6 chiffres
};

// ✅ **Enregistrer l’OTP dans la base de données**
export const saveOTP = async (userId) => {
  try {
    const otp = generateOTP();
    const expirationTime = new Date(Date.now() + 5 * 60 * 1000); // Expire après 5 minutes

    await User.findByIdAndUpdate(userId, {
      otp,
      otpExpiration: expirationTime,
    });

    return otp;
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'OTP :", error);
    throw new Error("Impossible de générer l'OTP");
  }
};

// ✅ **Envoyer l’OTP par SMS et Email**
export const sendOTP = async (user, otp) => {
  try {
    const message = `Votre code OTP est : ${otp}. Il est valide 5 minutes.`;
    
    if (user.phone) {
      await sendSMS(user.phone, message);
    }

    if (user.email) {
      await sendEmail(user.email, "Code OTP", message);
    }

    console.log(`OTP envoyé à ${user.phone || user.email}: ${otp}`);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'OTP :", error);
    throw new Error("Impossible d'envoyer l'OTP");
  }
};

// ✅ **Vérifier l’OTP**
export const verifyOTP = async (userId, otpEntered) => {
  try {
    const user = await User.findById(userId);

    if (!user || !user.otp || !user.otpExpiration) {
      return { success: false, message: "OTP invalide ou expiré" };
    }

    if (new Date() > user.otpExpiration) {
      return { success: false, message: "OTP expiré" };
    }

    if (user.otp !== otpEntered) {
      return { success: false, message: "OTP incorrect" };
    }

    // ✅ Supprimer l’OTP après validation
    user.otp = null;
    user.otpExpiration = null;
    await user.save();

    return { success: true, message: "OTP vérifié avec succès" };
  } catch (error) {
    console.error("Erreur lors de la vérification de l'OTP :", error);
    return { success: false, message: "Erreur lors de la vérification de l'OTP" };
  }
};
