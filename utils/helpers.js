import bcrypt from "bcryptjs";

/**
 * 🔹 Nettoie et formate un numéro de téléphone
 * - Supprime les espaces et les caractères spéciaux inutiles
 * - Assure un format uniforme avant stockage ou utilisation
 */
export const formatPhoneNumber = (phone) => {
    return phone.replace(/\s+/g, "").trim();
};

/**
 * 🔹 Génère un code OTP à 6 chiffres
 * - Utilisé pour la validation des connexions et transactions
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 🔹 Génère un code PIN à 4 chiffres
 * - Utilisé pour la sécurité des transactions
 */
export const generatePIN = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * 🔹 Hashage sécurisé des mots de passe et PIN
 * - Utilise bcrypt avec un sel pour un stockage sécurisé
 */
export const hashData = async (data) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(data, salt);
};

/**
 * 🔹 Vérifie si un PIN ou un mot de passe correspond à son hash
 * - Utilisé pour valider un PIN ou un mot de passe lors d'une connexion
 */
export const verifyHash = async (enteredData, hashedData) => {
    return await bcrypt.compare(enteredData, hashedData);
};
