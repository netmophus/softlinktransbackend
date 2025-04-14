

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateOTP } from "../services/otpService.js";
import { sendSMS } from "../services/smsService.js"; // 🔹 Service SMS ajouté
import ActivityLog from "../models/ActivityLog.js";




// 🔑 Génération du Token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId }, // 🔥 Tu peux aussi ajouter le rôle ici si tu veux : { id: userId, role: user.role }
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // 🔥 Durée de validité du token, ici 7 jours
  );
};


// 🔹 Fonction pour générer un PIN à 4 chiffres
const generatePIN = () => Math.floor(1000 + Math.random() * 9000).toString();

// 🔹 Nettoyage du format du numéro de téléphone
const formatPhoneNumber = (phone) => phone.replace(/\s+/g, "").trim(); // Supprime les espaces

// 🔹 INSCRIPTION

// export const register = async (req, res) => {
//   const { name, phone, password, role } = req.body;

//   try {
//       console.log("📥 Données reçues :", { name, phone, password, role });

//       const formattedPhone = formatPhoneNumber(phone);
//       console.log("📞 Numéro de téléphone formaté :", formattedPhone);

//       let user = await User.findOne({ phone: formattedPhone });
//       if (user) {
//           console.log("⚠️ Utilisateur déjà existant :", user);
//           return res.status(400).json({ msg: "Ce numéro est déjà utilisé." });
//       }

//       const pin = generatePIN(); // ✅ Générer le PIN temporaire
//       console.log("🔢 PIN généré :", pin);

//       user = new User({
//           name,
//           phone: formattedPhone,
//           password, // ✅ On stocke le mot de passe en clair, il sera haché dans User.js
//           pin, // ✅ Stocke temporairement en clair, il sera haché dans User.js
//           role,
//           virtualAccount: { balance: 0, currency: "XOF" }
//       });

//       await user.save();
//       console.log("✅ Utilisateur enregistré avec succès :", user);

//       // 🔍 Journaliser la création de l'utilisateur dans ActivityLog
//       await ActivityLog.create({
//         userId: user._id,
//         action: "User Registration",
//         details: `Nouvel utilisateur créé avec le rôle ${role} et le numéro ${formattedPhone}.`,
//       });
//       console.log("📝 Création de l'utilisateur enregistrée dans ActivityLog.");

//       // Envoyer le PIN par SMS (en clair)
//       await sendSMS(formattedPhone, `Votre code PIN NIYYA est : ${pin}. Ne le partagez avec personne.`);
//       console.log("📤 SMS envoyé au :", formattedPhone);

//       res.status(201).json({ msg: "Inscription réussie. Votre PIN a été envoyé par SMS." });

//   } catch (error) {
//       console.error("❌ Erreur lors de l'inscription :", error);
//       res.status(500).json({ 
//           msg: "Erreur du serveur.",
//           error: error.message 
//       });
//   }
// };



export const register = async (req, res) => {
  const { name, phone, password, role } = req.body;

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Exemple : "583194"
  };
  

  try {
      console.log("📥 Données reçues :", { name, phone, password, role });

      // ✅ Formater le numéro de téléphone
      const formattedPhone = formatPhoneNumber(phone);
      if (!formattedPhone) {
          console.log("❌ Erreur lors du formatage du numéro de téléphone.");
          return res.status(400).json({ msg: "Numéro de téléphone invalide." });
      }
      console.log("📞 Numéro de téléphone formaté :", formattedPhone);

      // ✅ Vérifier si l'utilisateur existe déjà
      let user = await User.findOne({ phone: formattedPhone });
      if (user) {
          console.log("⚠️ Utilisateur déjà existant :", user);
          return res.status(400).json({ msg: "Ce numéro est déjà utilisé." });
      }

      // ✅ Générer un PIN temporaire sécurisé
      const pin = generatePIN(); 
      if (!pin) {
          console.log("❌ Erreur lors de la génération du PIN.");
          return res.status(500).json({ msg: "Erreur lors de la génération du PIN." });
      }
      console.log("🔢 PIN généré :", pin);


      // ✅ Générer un OTP
const otp = generateOTP();
const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // expire dans 5 minutes
console.log("🔐 OTP généré :", otp);


    // ✅ Créer un nouvel utilisateur
user = new User({
  name,
  phone: formattedPhone,
  password, 
  pin,  // ✅ Laisse le PIN brut ici, il sera haché par `UserSchema.pre("save")`
  role,
  virtualAccount: { balance: 0, currency: "XOF" },
  isActive: true,
  isActivated: false,
  otp: otp,
otpExpiration: otpExpiresAt,

});

// ✅ Sauvegarde de l'utilisateur - Cela va automatiquement hacher le PIN grâce à `UserSchema.pre("save")`
await user.save(); 

// 🔍 Vérifier si le PIN est bien haché dans la base de données
console.log("📌 PIN enregistré en base de données :", user.pin); // 🔥 Doit afficher un texte long avec `$2a$10$...`
console.log("✅ Utilisateur enregistré avec succès :", user);


      // ✅ Journaliser la création de l'utilisateur dans ActivityLog
      await ActivityLog.create({
        userId: user._id,
        action: "User Registration",
        details: `Nouvel utilisateur créé avec le rôle ${role} et le numéro ${formattedPhone}.`,
      });
      console.log("📝 Création de l'utilisateur enregistrée dans ActivityLog.");

      // ✅ Envoyer le PIN par SMS - C'est risqué en clair, à éviter.
      await sendSMS(formattedPhone, 
       // `Bienvenue sur SOFTLINK TRANSFERT.\nVotre PIN temporaire : ${pin}\nVotre code de vérification : ${otp} (valide 5 minutes)`
         `Bienvenue sur SOFTLINK TRANSFERT.\nVotre code de vérification : ${otp} (valide 5 minutes)`
      );
      
      console.log("📤 SMS envoyé au :", formattedPhone);

      res.status(201).json({ msg: "Inscription réussie. Votre PIN  a été envoyé par SMS." });

  } catch (error) {
      console.error("❌ Erreur lors de l'inscription :", error);
      res.status(500).json({ 
          msg: "Erreur du serveur.",
          error: error.message 
      });
  }
};


// Fonction pour formater le numéro de téléphone

// 🔹 CONNEXION AVEC OTP

export const login = async (req, res) => {
  const { phone, password, pin, method = "otp" } = req.body;
  console.log("📥 Données reçues pour connexion :", req.body);

  try {
    const formattedPhone = formatPhoneNumber(phone);
    const user = await User.findOne({ phone: formattedPhone });

    if (!user) return res.status(400).json({ msg: "Utilisateur introuvable." });
    if (!user.isActive) return res.status(403).json({ msg: "Compte désactivé. Contactez l'administrateur." });

    if (method === "password") {  // 🔑 Connexion par mot de passe uniquement
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) return res.status(400).json({ msg: "Mot de passe incorrect." });

        // ✅ Permettre la connexion par mot de passe même si l'utilisateur n'est pas activé
        const token = generateToken(user._id);
        return res.status(200).json({ 
            msg: "Connexion réussie avec mot de passe.",
            token,
            user
        });
    } 

    if (method === "pin") {  // 🔑 Connexion par PIN
      const isPinMatch = await bcrypt.compare(pin, user.pin);
      if (!isPinMatch) return res.status(400).json({ msg: "PIN incorrect." });

      if (!user.isActivated) { 
          return res.status(200).json({ 
            msg: "Connexion réussie avec un PIN temporaire. Vous devez changer votre PIN immédiatement.",
            forceChangePIN: true
          });
      }

      const token = generateToken(user._id);
      return res.status(200).json({ 
          msg: "Connexion réussie avec PIN.",
          token,
          user
      });
    }

    if (method === "otp") {  // 🔑 Connexion par OTP
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) return res.status(400).json({ msg: "Mot de passe incorrect." });

      // 🔑 Vérification de l'activation de l'utilisateur (obligatoire pour OTP)
      if (!user.isActivated) {
          return res.status(403).json({ msg: "Votre compte n'est pas activé. Veuillez contacter votre superviseur." });
      }

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // OTP valide pour 5 minutes
      await user.save();

      await sendSMS(formattedPhone, `Votre code OTP est : ${otp}. Il est valable 5 minutes.`);
      return res.status(200).json({ msg: "OTP envoyé à votre téléphone." });
    }

    return res.status(400).json({ msg: "Méthode de connexion invalide." });
  } catch (error) {
    console.error("❌ Erreur lors de la connexion :", error);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};


//🔹 VÉRIFICATION DE L'OTP
// export const verifyOTP = async (req, res) => {
//   const { phone, otp } = req.body;  // <-- Utilise otp ici

//   try {
//     const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
//     const user = await User.findOne({ phone: formattedPhone });

//     if (!user) return res.status(400).json({ msg: "Utilisateur introuvable." });

//     // Vérifier si un OTP a été généré et n'est pas expiré
//     if (!user.otp || !user.otpExpiration) {
//       return res.status(400).json({ msg: "Aucun OTP généré ou OTP expiré." });
//     }

//     if (new Date() > user.otpExpiration) {
//       return res.status(400).json({ msg: "OTP expiré." });
//     }

//     if (user.otp !== otp) {
//       return res.status(400).json({ msg: "OTP incorrect." });
//     }

//     console.log("✅ OTP validé avec succès pour l'utilisateur :", user.name);

//     // Supprimer l’OTP après validation
//     user.otp = null;
//     user.otpExpiration = null;
//     await user.save();

//     const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
//     console.log("✅ Token généré :", token);

//     res.status(200).json({ token, user, msg: "Connexion réussie par OTP." });
//   } catch (error) {
//     console.error("❌ Erreur lors de la validation de l'OTP :", error.message);
//     res.status(500).json({ msg: "Erreur du serveur." });
//   }
// };
export const verifyOTP = async (req, res) => {
  const { phone, otp } = req.body;

  try {
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const user = await User.findOne({ phone: formattedPhone });

    if (!user) return res.status(400).json({ msg: "Utilisateur introuvable." });

    // Vérifier si un OTP a été généré et n'est pas expiré
    if (!user.otp || !user.otpExpiration) {
      return res.status(400).json({ msg: "Aucun OTP généré ou OTP expiré." });
    }

    if (new Date() > user.otpExpiration) {
      return res.status(400).json({ msg: "OTP expiré." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ msg: "OTP incorrect." });
    }

    // ✅ Vérifier que seul un user peut être activé par OTP
    if (user.role !== "user") {
      return res.status(403).json({ msg: "Ce type de compte ne peut pas être activé par OTP." });
    }

    // ✅ Activer le compte
    user.isActivated = true;
    user.otp = null;
    user.otpExpiration = null;
    await user.save();

    console.log("✅ Compte activé avec succès pour :", user.name);

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ token, user, msg: "✅ Vérification réussie. Compte activé." });

  } catch (error) {
    console.error("❌ Erreur lors de la validation de l'OTP :", error.message);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};


// 🔹 VÉRIFICATION DU PIN

export const verifyPIN = async (req, res) => {
  const { phone, pin } = req.body;

  try {
    const formattedPhone = formatPhoneNumber(phone);
    const user = await User.findOne({ phone: formattedPhone });

    if (!user) return res.status(400).json({ msg: "Utilisateur introuvable." });

    const isPinMatch = await bcrypt.compare(pin, user.pin);
    if (!isPinMatch) return res.status(400).json({ msg: "PIN incorrect." });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    console.log("✅ Connexion réussie par PIN - Utilisateur :", user);
    console.log("✅ Token généré :", token);

    res.status(200).json({ msg: "Connexion réussie par PIN.", token, user });
  } catch (error) {
    console.error("❌ Erreur lors de la validation du PIN :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};

export const resetPIN = async (req, res) => {
  const { phone } = req.body;
  try {
    // Formatage du numéro
    const formattedPhone = formatPhoneNumber(phone);
    
    // Recherche de l'utilisateur par numéro
    const user = await User.findOne({ phone: formattedPhone });
    if (!user) return res.status(400).json({ msg: "Utilisateur introuvable." });
    
    // Génération d'un nouveau PIN (par exemple, un PIN à 4 chiffres)
    const newPin = generatePIN();
    
    // Mise à jour du PIN de l'utilisateur
    user.pin = newPin;
    await user.save();
    
    console.log("🔢 Nouveau PIN généré :", newPin);
    
    // Préparation et envoi du SMS
    const message = `Votre nouveau PIN NIYYA est : ${newPin}. Ne le partagez avec personne.`;
    const smsResponse = await sendSMS(formattedPhone, message);
    
    if (smsResponse.success) {
      console.log("✅ SMS envoyé avec succès :", formattedPhone);
      return res.status(200).json({ msg: "Nouveau PIN envoyé par SMS." });
    } else {
      console.error("❌ Erreur lors de l'envoi du PIN par SMS.");
      return res.status(500).json({ msg: "Erreur lors de l'envoi du PIN par SMS." });
    }
  } catch (error) {
    console.error("❌ Erreur lors du reset du PIN :", error.message);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};

// 🔹 DÉCONNEXION
export const logout = (req, res) => {
  res.status(200).json({ msg: "Déconnexion réussie. Supprimez le token côté frontend." });
};



 const getAuthenticatedUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -pin -otp"); // Exclure les champs sensibles

    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non trouvé." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'utilisateur :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};




 const changePIN = async (req, res) => {
  const { phone, tempPin, newPin } = req.body;

  try {
    const user = await User.findOne({ phone });

    if (!user) return res.status(400).json({ msg: "Utilisateur introuvable." });

    const isMatch = await bcrypt.compare(tempPin, user.pin);

    if (!isMatch) return res.status(400).json({ msg: "PIN temporaire incorrect." });

    if (newPin.length < 4) return res.status(400).json({ msg: "Le nouveau PIN doit avoir au moins 4 chiffres." });

    const salt = await bcrypt.genSalt(10);
    const hashedNewPin = await bcrypt.hash(newPin, salt);

    user.pin = hashedNewPin;
    user.isActivated = true; // 🔥 Le compte est maintenant activé !
    await user.save();

    res.status(200).json({ msg: "Votre PIN a été changé avec succès." });
  } catch (error) {
    console.error("❌ Erreur lors du changement de PIN :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};




const requestResetPassword = async (req, res) => {
  const { phone } = req.body;

  try {
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ msg: "Utilisateur introuvable" });
    }

    const otpCode = generateOTP();

    // ✅ Enregistre l’OTP directement dans le user
    user.otp = otpCode;
    user.otpExpiration = Date.now() + 5 * 60 * 1000;
    await user.save();

    // ✅ Envoie du SMS
    const message = `Votre code de réinitialisation Softlink est : ${otpCode}`;
    const smsResponse = await sendSMS(phone, message);

    if (!smsResponse.success) {
      return res.status(500).json({ msg: "Échec de l'envoi du SMS" });
    }

    return res.status(200).json({ msg: "OTP envoyé à votre téléphone." });
  } catch (error) {
    console.error("❌ Erreur reset password :", error);
    return res.status(500).json({ msg: "Erreur serveur." });
  }
};

export const verifyResetOtp = async (req, res) => {
  const { phone, otp, newPassword } = req.body;

  try {
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const user = await User.findOne({ phone: formattedPhone });

    if (!user) return res.status(404).json({ msg: "Utilisateur introuvable." });

    if (!user.otp || !user.otpExpiration) {
      return res.status(400).json({ msg: "Aucun OTP trouvé ou expiré." });
    }

    if (new Date() > user.otpExpiration) {
      return res.status(400).json({ msg: "OTP expiré." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ msg: "OTP incorrect." });
    }

    // ✅ Mise à jour du mot de passe
    user.password = newPassword;
    user.otp = null;
    user.otpExpiration = null;

    await user.save();

    return res.status(200).json({ msg: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error("❌ Erreur verify-reset-otp :", error.message);
    return res.status(500).json({ msg: "Erreur serveur." });
  }
};


export default {
  register,
  login,
  verifyOTP,
  verifyPIN,
  logout,
  resetPIN,
  changePIN,
  getAuthenticatedUser,
  requestResetPassword,
  verifyResetOtp
};