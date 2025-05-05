import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateOTP } from "../services/otpService.js";
import { sendSMS } from "../services/smsService.js";
import City from "../models/City.js"; 
import ActivityLog from "../models/ActivityLog.js";




export const createSupervisor = async (req, res) => {
  try {
      console.log("🔹 Début du processus de création du superviseur");
      
      const { name, phone, password, city } = req.body;
      console.log("📥 Données reçues :", { name, phone, city });

      if (!name || !phone || !password || !city) {
          console.warn("⚠️ Tous les champs ne sont pas remplis !");
          return res.status(400).json({ msg: "Tous les champs sont requis, y compris la ville." });
      }

      // Vérifier si la ville existe
      console.log("🔍 Vérification de l'existence de la ville...");
      const cityExists = await City.findById(city);
      if (!cityExists) {
          console.warn("⚠️ Ville non trouvée :", city);
          return res.status(400).json({ msg: "La ville sélectionnée est invalide." });
      }

      // Formatage du numéro de téléphone
      const formattedPhone = phone.replace(/\s+/g, "").trim();
      console.log("📞 Numéro de téléphone formaté :", formattedPhone);

      // Vérifier si l'utilisateur existe déjà
      console.log("🔍 Vérification de l'existence de l'utilisateur...");
      const existingUser = await User.findOne({ phone: formattedPhone });
      if (existingUser) {
          console.warn("⚠️ Utilisateur déjà existant avec ce numéro :", formattedPhone);
          return res.status(400).json({ msg: "Ce numéro est déjà utilisé." });
      }

      // Génération du PIN sécurisé
      console.log("🔐 Génération d'un PIN sécurisé...");
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const hashedPin = await bcrypt.hash(pin, 10);

      // Création du superviseur
      console.log("📝 Création du superviseur...");
      const newSupervisor = new User({
          name,
          phone: formattedPhone,
          password,
          pin: hashedPin,
          role: "supervisor",
          isActive: false,
          city,
          virtualAccount: { balance: 0, currency: "XOF" },
          createdBy: req.userId, // 🔥 Qui crée ce superviseur ?
      });

      await newSupervisor.save();
      console.log("✅ Superviseur créé avec succès :", { id: newSupervisor._id, name: newSupervisor.name, phone: newSupervisor.phone });

    // 🔍 Journaliser la création du superviseur dans ActivityLog
    await ActivityLog.create({
      userId: req.userId, // ou autre identifiant de l'utilisateur connecté
      action: "Création de superviseur",
      details: `Superviseur créé : ${name}, Téléphone : ${formattedPhone}, Ville : ${city}`
    });


      res.status(201).json({ msg: "Superviseur créé avec succès." });

  } catch (error) {
      console.error("❌ Erreur lors de la création du superviseur :", error);
      res.status(500).json({ msg: "Erreur du serveur." });
  }
};


export const getSupervisors = async (req, res) => {
  try {
    const supervisors = await User.find({ role: "supervisor" })
      .populate("city", "name") // 🔹 Ajoute ceci pour afficher le nom de la ville
      .sort({ createdAt: -1 });

    res.status(200).json(supervisors);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des superviseurs :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};


export const toggleSupervisorStatus = async (req, res) => {
  try {
      const supervisor = await User.findById(req.params.id);

      if (!supervisor) {
          return res.status(404).json({ msg: "Superviseur non trouvé." });
      }

      // Basculer l'état isActive
      supervisor.isActive = !supervisor.isActive;
      await supervisor.save();

      res.status(200).json({ msg: "Statut mis à jour.", isActive: supervisor.isActive });
  } catch (error) {
      console.error("❌ Erreur lors du changement de statut :", error);
      res.status(500).json({ msg: "Erreur du serveur." });
  }
};



