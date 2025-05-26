import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateOTP } from "../services/otpService.js";
import { sendSMS } from "../services/smsService.js";
import City from "../models/City.js";
import ActivityLog from "../models/ActivityLog.js";
import InternalSettlement from "../models/InternalSettlement.js";
import CashRegister from "../models/CashRegister.js";
import CashMovement from "../models/CashMovement.js";
import admin from "firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";


// Initialisation Firebase Admin (au début du fichier)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}


const db = getFirestore();





// S'assurer que Firebase Admin est initialisé



export const startConversationWithUser = async (req, res) => {
  try {
    const { userPhone } = req.body;
    const agentPhone = req.user.phone;

    if (!userPhone) {
      return res.status(400).json({ msg: "Numéro de l'utilisateur requis." });
    }

    const convoId = `${userPhone}_${agentPhone}`;
    const convoRef = doc(db, "conversations", convoId);
    const convoSnap = await getDoc(convoRef);

    if (!convoSnap.exists()) {
      await setDoc(convoRef, {
        userPhone,
        agentPhone,
        messages: [],
        createdAt: Timestamp.now(), // (optionnel mais conseillé)
      });
    }

    res.status(201).json({ msg: "Conversation initialisée." });
  } catch (error) {
    console.error("❌ Erreur création conversation :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};




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







export const createAgent = async (req, res) => {
  try {
    const { name, phone, password, pin } = req.body;

    console.log("🧾 Données reçues :", req.body);

    if (!name || !phone || !password) {
      return res.status(400).json({ msg: "Nom, téléphone et mot de passe sont requis." });
    }

    // 🔍 Vérification si le téléphone est déjà utilisé
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ msg: "Ce numéro est déjà utilisé." });
    }

    // ✅ Création du compte MongoDB
    const newAgentData = {
      name,
      phone,
      password,
      role: "agent",
      isVerified: true,
      isActivated: true,
    };
    if (pin) newAgentData.pin = pin;

    const agent = new User(newAgentData);
    await agent.save();

    // ✅ Ensuite : enregistrement dans Firestore
const db = getFirestore();
await db.collection("agents").doc(phone).set({
  phone,
  name,
  createdAt: Timestamp.now(),
});


    res.status(201).json({
      msg: "Agent créé avec succès.",
      agent: {
        _id: agent._id,
        name: agent.name,
        phone: agent.phone,
        createdAt: agent.createdAt,
      },
    });

  } catch (error) {
    console.error("❌ Erreur création agent :", error);
    res.status(500).json({ msg: "Erreur serveur lors de la création de l'agent." });
  }
};





// ✅ Obtenir tous les agents (triés du plus récent au plus ancien)
export const getAllAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" })
      .select("name phone createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json(agents);
  } catch (error) {
    console.error("Erreur récupération agents :", error);
    res.status(500).json({ msg: "Erreur serveur lors de la récupération des agents." });
  }
};



export const getInternalSettlements = async (req, res) => {
  try {
    const settlements = await InternalSettlement.find()
      .populate("fromCashRegister", "registerNumber")
      .populate("toCashRegister", "registerNumber")
      .populate("interCityTransfer", "amount status");

    res.status(200).json(settlements);
  } catch (error) {
    console.error("❌ Erreur récupération des compensations :", error);
    res.status(500).json({ msg: "Erreur serveur lors de la récupération des compensations." });
  }
};






export const settleInternalSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📥 Requête de validation de compensation pour l'ID : ${id}`);

    const settlement = await InternalSettlement.findById(id)
      .populate("fromCashRegister", "registerNumber currentBalance")
      .populate("toCashRegister", "registerNumber currentBalance");

    if (!settlement) {
      return res.status(404).json({ msg: "Compensation introuvable." });
    }

    console.log("🔍 Compensation récupérée :", {
      amount: settlement.amount,
      from: settlement.fromCashRegister?.registerNumber,
      to: settlement.toCashRegister?.registerNumber,
      settled: settlement.settled,
    });

    if (settlement.settled) {
      return res.status(400).json({ msg: "Déjà réglée." });
    }

    // ✅ Étape 1 : marquer comme réglée
    settlement.settled = true;
    settlement.updatedAt = new Date();
    await settlement.save();
    console.log("✅ Compensation marquée comme réglée.");

    // ✅ Étape 2 : créditer la caisse B
    await CashMovement.create({
      cashRegister: settlement.toCashRegister._id,
      type: "deposit",
      amount: settlement.amount,
      operationType: "intercity_compensation",
      performedBy: req.user._id,
      note: `Remboursement de ${settlement.amount} XOF par la caisse ${settlement.fromCashRegister?.registerNumber}`,
      date: new Date(),
    });

    const caisseB = await CashRegister.findById(settlement.toCashRegister._id);
    caisseB.currentBalance += settlement.amount;
    await caisseB.save();
    console.log(`✅ Caisse B (${caisseB.registerNumber}) créditée de ${settlement.amount}. Nouveau solde : ${caisseB.currentBalance}`);

    // ✅ Étape 3 : débiter la caisse A
    await CashMovement.create({
      cashRegister: settlement.fromCashRegister._id,
      type: "withdrawal",
      amount: settlement.amount,
      operationType: "intercity_compensation_send",
      performedBy: req.user._id,
      note: `Débit de compensation envoyée vers ${settlement.toCashRegister?.registerNumber}`,
      date: new Date(),
    });

    const caisseA = await CashRegister.findById(settlement.fromCashRegister._id);
    caisseA.currentBalance -= settlement.amount;
    await caisseA.save();
    console.log(`✅ Caisse A (${caisseA.registerNumber}) débitée de ${settlement.amount}. Nouveau solde : ${caisseA.currentBalance}`);

    return res.status(200).json({ msg: "Compensation réglée entre les deux caisses." });

  } catch (error) {
    console.error("❌ Erreur validation compensation :", error);
    return res.status(500).json({ msg: "Erreur serveur." });
  }
};



export const getCompensationSummary = async (req, res) => {
  try {
    // 🔍 Récupérer toutes les compensations réglées
    const settlements = await InternalSettlement.find({ settled: true })
      .populate({
        path: "fromCashRegister",
        populate: {
          path: "supervisor",
          populate: { path: "city", select: "name" },
        },
      })
      .populate({
        path: "toCashRegister",
        populate: {
          path: "supervisor",
          populate: { path: "city", select: "name" },
        },
      });

    const perCity = {};   // 🔄 Données groupées par ville
    const perCash = {};   // 🔄 Données groupées par caisse

    settlements.forEach((settlement) => {
      const from = settlement.fromCashRegister;
      const to = settlement.toCashRegister;
      const amount = settlement.amount;

      const fromCityName = from?.supervisor?.city?.name || "Inconnue";
      const toCityName = to?.supervisor?.city?.name || "Inconnue";

      // 🔹 Par ville
      if (!perCity[fromCityName]) perCity[fromCityName] = { paid: 0, received: 0 };
      if (!perCity[toCityName]) perCity[toCityName] = { paid: 0, received: 0 };

      perCity[fromCityName].paid += amount;
      perCity[toCityName].received += amount;

      // 🔹 Par caisse
      const fromCash = from?.registerNumber || "Caisse inconnue";
      const toCash = to?.registerNumber || "Caisse inconnue";

      if (!perCash[fromCash]) perCash[fromCash] = { paid: 0, received: 0 };
      if (!perCash[toCash]) perCash[toCash] = { paid: 0, received: 0 };

      perCash[fromCash].paid += amount;
      perCash[toCash].received += amount;
    });

    return res.status(200).json({ perCity, perCash });
  } catch (error) {
    console.error("❌ Erreur génération du rapport de compensation :", error);
    return res.status(500).json({ msg: "Erreur serveur." });
  }
};