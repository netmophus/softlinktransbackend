import Identification from "../models/Identification.js";
import User from "../models/User.js";

// ➕ Créer un dossier d’identification
// export const createIdentification = async (req, res) => {
//   try {
//     const { fullName, birthDate, nationality, documentType, documentNumber } = req.body;

//     // Vérifier si une identification existe déjà pour cet utilisateur
//     const existing = await Identification.findOne({ user: req.user.id });
//     if (existing) {
//       return res.status(400).json({ msg: "Une demande existe déjà." });
//     }

//     const identification = new Identification({
//       user: req.user.id,
//       fullName,
//       birthDate,
//       nationality,
//       documentType,
//       documentNumber,
//       status: "en attente",
//     });

//     await identification.save();
//     res.status(201).json(identification);
//   } catch (error) {
//     console.error("Erreur création identification :", error);
//     res.status(500).json({ msg: "Erreur serveur" });
//   }
// };


export const createIdentification = async (req, res) => {
    try {
      const {
        fullName,
        dateOfBirth,
        gender,
        country,
        city,
        address,
        profession,
        idType,
        idNumber,
        idFrontImage,
        idBackImage,
        selfieWithId,
      } = req.body;
  
      // Vérifie si une demande existe déjà pour l’utilisateur
      const existing = await Identification.findOne({ user: req.user.id });
      if (existing) {
        return res.status(400).json({ msg: "Une demande existe déjà pour cet utilisateur." });
      }
  
      const identification = new Identification({
        user: req.user.id,
        fullName,
        dateOfBirth,
        gender,
        country,
        city,
        address,
        profession,
        idType,
        idNumber,
        idFrontImage,
        idBackImage,
        selfieWithId,
        status: "en attente",
      });
  
      await identification.save();
      res.status(201).json(identification);
    } catch (error) {
      console.error("❌ Erreur création identification :", error);
      res.status(500).json({ msg: "Erreur serveur" });
    }
  };
  

// 🔍 Voir son propre dossier d’identification
export const getMyIdentification = async (req, res) => {
  try {
    const identification = await Identification.findOne({ user: req.user.id });
    if (!identification) {
      return res.status(404).json({ msg: "Aucune identification trouvée." });
    }
    res.json(identification);
  } catch (error) {
    console.error("Erreur récupération identification :", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
};

// 📋 Admin - Voir tous les dossiers
export const getAllIdentifications = async (req, res) => {
  try {
    const identifications = await Identification.find().populate("user", "name phone");
    res.json(identifications);
  } catch (error) {
    console.error("Erreur récupération des identifications :", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
};

// ✅ Admin - Mise à jour du statut
export const updateIdentificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const identification = await Identification.findById(id);
    if (!identification) {
      return res.status(404).json({ msg: "Identification non trouvée." });
    }

    identification.status = status;
    await identification.save();

    res.json({ msg: "Statut mis à jour avec succès.", identification });
  } catch (error) {
    console.error("Erreur mise à jour statut :", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
};
