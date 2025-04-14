import jwt from "jsonwebtoken";
import User from "../models/User.js";

const AUTH_TIMEOUT = 30 * 60 * 1000; // 30 minutes d'inactivité avant déconnexion

export const authenticateUser = async (req, res, next) => {
  try {
    // ✅ On ne prend que le token depuis l'Authorization header (et non les cookies)
    let token = req.headers?.authorization?.split(" ")[1];

    console.log("📌 Token reçu dans authenticateUser:", token); // 🔍 Vérification

    if (!token) {
      console.log("⚠️ Aucun token reçu !");
      return res.status(401).json({ msg: "Accès non autorisé. Veuillez vous connecter." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔑 Token décodé :", decoded);

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log("❌ Utilisateur non trouvé !");
      return res.status(401).json({ msg: "Utilisateur non trouvé. Veuillez vous reconnecter." });
    }

    console.log("✅ Utilisateur authentifié :", user.role);
    req.user = user;           // Ajoute l'utilisateur complet
    req.userId = user._id;      // ✅ Définit explicitement req.userId pour l'utiliser ailleurs
    next();
  } catch (error) {
    console.log("🚨 Erreur lors de l'authentification :", error.message);
    res.status(401).json({ msg: "Session invalide. Veuillez vous reconnecter." });
  }
};

export const logoutUser = (req, res) => {
  res.status(200).json({ msg: "Déconnexion réussie." });
};





// import jwt from "jsonwebtoken";
// import User from "../models/User.js";

// const AUTH_TIMEOUT = 30 * 60 * 1000; // 30 minutes d'inactivité avant déconnexion

// export const authenticateUser = async (req, res, next) => {
//   try {
//     let token = req.headers?.authorization?.split(" ")[1];
//     console.log("📌 Token reçu dans authenticateUser:", token);

//     if (!token) {
//       console.log("⚠️ Aucun token reçu !");
//       return res.status(401).json({ msg: "Accès non autorisé. Veuillez vous connecter." });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     console.log("🔑 Token décodé :", decoded);

//     const user = await User.findById(decoded.id);
//     if (!user) {
//       console.log("❌ Utilisateur non trouvé !");
//       return res.status(401).json({ msg: "Utilisateur non trouvé. Veuillez vous reconnecter." });
//     }

//     // ⏱️ Vérification de l'inactivité
//     const now = Date.now();
//     const lastActivity = new Date(user.lastActivity).getTime();

//     if (now - lastActivity > AUTH_TIMEOUT) {
//       console.log("⏱️ Session expirée pour inactivité.");
//       return res.status(401).json({ msg: "Session expirée pour inactivité. Veuillez vous reconnecter." });
//     }

//     // 🔄 Mise à jour de la dernière activité
//     user.lastActivity = new Date();
//     await user.save();

//     req.user = user;
//     req.userId = user._id;
//     next();

//   } catch (error) {
//     console.log("🚨 Erreur lors de l'authentification :", error.message);
//     res.status(401).json({ msg: "Session invalide. Veuillez vous reconnecter." });
//   }
// };

// export const logoutUser = (req, res) => {
//   res.status(200).json({ msg: "Déconnexion réussie." });
// };
