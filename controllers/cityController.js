import City from "../models/City.js";
import ActivityLog from "../models/ActivityLog.js";

// ✅ **Créer une nouvelle ville**
export const createCity = async (req, res) => {
  try {
    const { name, region } = req.body;

    if (!name || !region) {
      return res.status(400).json({ msg: "Veuillez fournir le nom et la région de la ville." });
    }

    // Vérifier si la ville existe déjà
    const existingCity = await City.findOne({ name: name.trim() });
    if (existingCity) {
      return res.status(400).json({ msg: "Cette ville existe déjà." });
    }

    const newCity = new City({ name: name.trim(), region: region.trim() });
    await newCity.save();


     // 🔍 Journaliser la création de la ville dans ActivityLog
     await ActivityLog.create({
      userId: req.userId, // ou autre identifiant de l'utilisateur connecté
      action: "Création de ville",
      details: `Ville créée : ${name}, Région : ${region}`
    });

    return res.status(201).json({ msg: "Ville créée avec succès.", city: newCity });

  } catch (error) {
    console.error("❌ Erreur lors de la création de la ville :", error);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};

// ✅ **Récupérer toutes les villes**
export const getCities = async (req, res) => {
  try {
    const cities = await City.find().sort({ name: 1 }); // Trier par ordre alphabétique
    return res.status(200).json(cities);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des villes :", error);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};
