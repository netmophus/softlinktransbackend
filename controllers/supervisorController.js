import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { formatPhoneNumber } from "../utils/helpers.js"; // 🔹 Fonction de formatage du téléphone
import ActivityLog from "../models/ActivityLog.js"; // Assurez-vous d'importer le modèle ActivityLog
import CashRegister from "../models/CashRegister.js";
import { generateOTP } from "../services/otpService.js";
import { sendSMS } from "../services/smsService.js";
// controllers/dailyCashierReportController.js
import DailyCashierReport from "../models/DailyCashierReport.js";
import ClosingReport from "../models/ClosingReport.js";
import CashMovement from "../models/CashMovement.js";


// controllers/supervisorController.js

export const getClosingReportDetails = async (req, res) => {
  try {
    const { reportId } = req.params;

    // 1️⃣ Trouver le rapport de fermeture par son _id
    const report = await ClosingReport.findById(reportId)
      .populate("cashier", "name phone")
      .populate("supervisor", "name phone");

    if (!report) return res.status(404).json({ msg: "Rapport non trouvé" });

    // 2️⃣ Trouver la caisse associée (pour le numéro, etc)
    const cashRegister = await CashRegister.findById(report.cashRegister);

    // 3️⃣ Récupérer les mouvements de cette caisse
    const movements = await CashMovement.find({ cashRegister: report.cashRegister }).sort({ date: 1 });

    res.json({
      ...report.toObject(),
      registerNumber: cashRegister?.registerNumber,
      openedAt: cashRegister?.openedAt,
      closedAt: cashRegister?.closedAt,
      movements,
    });
  } catch (err) {
    res.status(500).json({ msg: "Erreur lors de la récupération du rapport." });
  }
};





// export const getClosingReports = async (req, res) => {
//   try {
//     const supervisorId = req.user._id;

//     // Tu peux filtrer par superviseur pour ne voir que les rapports de l'utilisateur connecté
//     const reports = await ClosingReport.find({ supervisor: supervisorId })
//       .populate("cashier", "name phone")
//       .populate("cashRegister", "registerNumber openedAt")
//       .sort({ closedAt: -1 });

//     const formatted = reports.map(rep => ({
//       id: rep.cashRegister?._id?.toString() ?? rep._id.toString(),
//       registerNumber: rep.registerNumber ?? rep.cashRegister?.registerNumber ?? "-",
//       cashier: rep.cashier,
//       openedAt: rep.openedAt ?? rep.cashRegister?.openedAt ?? "-",
//       closedAt: rep.closedAt,
//       openingAmount: rep.openingAmount,
//       closingAmount: rep.actualClosingAmount ?? rep.closingAmount,
//       totalDeposits: rep.totalDeposits,
//       totalWithdrawals: rep.totalWithdrawals,
//       theoreticalBalance: rep.expectedClosingAmount,
//       gap: rep.discrepancy,
//       closingNote: rep.note ?? "-",
//     }));

//     res.status(200).json(formatted);
//   } catch (error) {
//     console.error("❌ Erreur récupération rapports de fermeture :", error);
//     res.status(500).json({ msg: "Erreur du serveur." });
//   }
// };



// controllers/supervisorController.js

export const getClosingReports = async (req, res) => {
  try {
    const supervisorId = req.user._id;

    // Rapports liés au superviseur connecté
    const reports = await ClosingReport.find({ supervisor: supervisorId })
      .populate("cashier", "name phone")
      .populate("cashRegister", "registerNumber openedAt")
      .sort({ closedAt: -1 });

    const formatted = reports.map(rep => ({
      id: rep._id.toString(), // 👈 C'EST ICI LA CLE!
      registerNumber: rep.registerNumber ?? rep.cashRegister?.registerNumber ?? "-",
      cashier: rep.cashier,
      openedAt: rep.openedAt ?? rep.cashRegister?.openedAt ?? "-",
      closedAt: rep.closedAt,
      openingAmount: rep.openingAmount,
      closingAmount: rep.actualClosingAmount ?? rep.closingAmount,
      totalDeposits: rep.totalDeposits,
      totalWithdrawals: rep.totalWithdrawals,
      theoreticalBalance: rep.expectedClosingAmount,
      gap: rep.discrepancy,
      closingNote: rep.note ?? "-",
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("❌ Erreur récupération rapports de fermeture :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};




export const createCashier = async (req, res) => {
    try {
        const { name, phone, password } = req.body;

        if (!name || !phone || !password) {
            return res.status(400).json({ msg: "Tous les champs sont requis." });
        }

        // ✅ Formatage du numéro pour éviter les espaces
        const formattedPhone = phone.replace(/\s+/g, "").trim();
        console.log("📞 Numéro formaté :", formattedPhone);

        // ✅ Vérifier si le numéro existe déjà
        const existingUser = await User.findOne({ phone: formattedPhone });
        if (existingUser) {
            console.log("⚠️ Numéro déjà utilisé :", formattedPhone);
            return res.status(400).json({ msg: "Ce numéro est déjà utilisé." });
        }

        // ✅ Récupérer le superviseur qui crée le caissier
        const supervisor = await User.findById(req.user._id);
        if (!supervisor || supervisor.role !== "supervisor") {
            return res.status(400).json({ msg: "Seul un superviseur peut créer un caissier." });
        }

        if (!supervisor.city) {
            return res.status(400).json({ msg: "Le superviseur n'est pas associé à une ville. Impossible de créer un caissier." });
        }

        // ✅ Génération du PIN sécurisé
        const pin = Math.floor(1000 + Math.random() * 9000).toString(); // 🔹 PIN à 4 chiffres
        const hashedPin = await bcrypt.hash(pin, 10);

        // ✅ Création du caissier avec la ville du superviseur
        const newCashier = new User({
            name,
            phone: formattedPhone,
            password, // ✅ Géré par le hashage automatique dans User.js
            pin: hashedPin, // 🔹 Stocker le PIN sécurisé
            role: "cashier",
            isActive: false, // 🔹 Activé plus tard par le superviseur
            supervisor: req.user._id, // 🔥 Association automatique au superviseur
            city: supervisor.city, // 🔥 Associer la ville du superviseur au caissier
            virtualAccount: { balance: 0, currency: "XOF" },
            createdBy: req.user._id, // 🔥 ajout recommandé
        });

        await newCashier.save();
        console.log("✅ Caissier créé avec succès et associé au superviseur :", req.user.name);

        // 🔍 Journaliser la création du caissier dans ActivityLog
        await ActivityLog.create({
            userId: req.user._id, // Superviseur qui a créé le caissier
            action: "Création de Caissier",
            details: `Caissier créé : ${name} (${formattedPhone}) par le superviseur ${supervisor.name} dans la ville ${supervisor.city}`
        });



        console.log("📝 Création du caissier enregistrée dans ActivityLog.");
        res.status(201).json({ msg: "Caissier créé avec succès." });

    } catch (error) {
        console.error("❌ Erreur lors de la création du caissier :", error);
        res.status(500).json({ msg: "Erreur du serveur." });
    }
};






// 🔹 Liste des caissiers gérés par un superviseur et leurs caisses
export const getCashiers = async (req, res) => {
    try {
        console.log("🔍 Requête reçue : Récupération des caissiers et des caisses...");
        console.log("👤 Utilisateur authentifié :", req.user);

        const cashiers = await User.find({ role: "cashier", supervisor: req.user._id }).select("-password -pin");

        // 🔥 Comptabiliser les caisses ouvertes et fermées par caissier
        const cashierData = await Promise.all(cashiers.map(async (cashier) => {
            const openRegisters = await CashRegister.countDocuments({ cashier: cashier._id, status: "open" });
            const closedRegisters = await CashRegister.countDocuments({ cashier: cashier._id, status: "closed" });

            return {
                ...cashier.toObject(),
                openRegisters,
                closedRegisters
            };
        }));

        console.log("✅ Liste des caissiers récupérée :", cashierData.length, "caissiers trouvés.");
        res.status(200).json(cashierData);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des caissiers :", error);
        res.status(500).json({ msg: "Erreur du serveur." });
    }
};

  

  export const toggleCashierStatus = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("🔄 ID reçu pour bascule :", id);

        const cashier = await User.findById(id);
        if (!cashier) {
            console.log("❌ Caissier introuvable !");
            return res.status(404).json({ msg: "Caissier introuvable." });
        }

        cashier.isActive = !cashier.isActive;
        await cashier.save();
        console.log(`✅ Statut changé : ${cashier.name} est maintenant ${cashier.isActive ? "actif" : "inactif"}`);

        res.status(200).json({ msg: "Statut du caissier mis à jour avec succès." });
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour du statut :", error);
        res.status(500).json({ msg: "Erreur serveur." });
    }
};



// 🔹 Récupérer les informations du superviseur connecté
export const getSupervisorInfo = async (req, res) => {
    try {
        console.log("🔍 Requête reçue : Récupération des informations du superviseur...");
        
        const supervisor = await User.findById(req.user._id).select("name phone city role");
        
        if (!supervisor || supervisor.role !== "supervisor") {
            console.log("❌ Utilisateur non trouvé ou n'est pas un superviseur.");
            return res.status(404).json({ msg: "Superviseur non trouvé." });
        }

        console.log("✅ Superviseur trouvé :", supervisor);
        res.status(200).json(supervisor);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des informations du superviseur :", error);
        res.status(500).json({ msg: "Erreur du serveur." });
    }
};

  



export const getDailyReports = async (req, res) => {
    try {
      const { start, end, date } = req.query;
  
      const query = {};
  
      if (date) {
        // Filtrer sur la date exacte (sans l'heure)
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        query.date = { $gte: startDate, $lte: endDate };
      } else if (start || end) {
        query.date = {};
        if (start) query.date.$gte = new Date(start);
        if (end) query.date.$lte = new Date(end);
      }
  
      const reports = await DailyCashierReport.find(query)
        .populate("cashier", "name phone")
        .populate("cashRegister", "registerNumber")
        .sort({ date: -1 });
  
      res.status(200).json(reports);
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des rapports :", error);
      res.status(500).json({ msg: "Erreur du serveur." });
    }
  };





