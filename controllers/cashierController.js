
import CashRegister from "../models/CashRegister.js";
import User from "../models/User.js";
import UserTransaction from "../models/UserTransaction.js"; // ✅ Utilisation stricte du modèle
import { calculateFees } from "../utils/feeCalculator.js"; // ✅ Utilisation du calcul des frais
import InterCityTransfer from "../models/InterCityTransfer.js";
import City from "../models/City.js";
import { sendSMS } from "../services/smsService.js";
import QRCode from "qrcode";
import fs from "fs";
import PDFDocument from "pdfkit";
import CashMovement from "../models/CashMovement.js";
import mongoose from "mongoose";


// ✅ Vérifier si un numéro de téléphone existe dans la base et retourner le nom du sender

export const checkSenderController = async (req, res) => {
    try {
      let { phone } = req.params;
      
      if (!phone) {
        console.log("⚠️ Aucun numéro reçu !");
        return res.status(400).json({ msg: "Numéro requis." });
      }
  
      phone = phone.replace(/\s+/g, "").trim();
  
      // 🔹 Ajouter +227 si absent
      if (!phone.startsWith("+227")) {
        phone = `+227${phone}`;
      }
  
      console.log("🔍 Recherche du sender avec :", phone);
  
      // ✅ Vérification dans `InterCityTransfer`
      const sender = await InterCityTransfer.findOne({ senderPhone: phone });
  
      if (!sender) {
        console.log("❌ Sender non trouvé.");
        return res.json({ exists: false });
      }
  
      console.log("✅ Sender trouvé :", sender.senderFirstName, sender.senderLastName);
  
      return res.json({
        exists: true,
        senderFirstName: sender.senderFirstName, // ✅ Retourne le prénom
        senderLastName: sender.senderLastName    // ✅ Retourne le nom
      });
  
    } catch (error) {
      console.error("❌ Erreur lors de la vérification du sender :", error);
      res.status(500).json({ msg: "Erreur serveur." });
    }
  };
  

  

// ✅ Contrôleur pour calculer les frais
export const calculateFeesController = (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ msg: "Montant invalide." });
    }

    const { commission, tax } = calculateFees(parseFloat(amount));

    res.json({ commission, tax });
  } catch (error) {
    console.error("❌ Erreur lors du calcul des frais :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};


// ✅ Fonction pour générer un code secret de 24 caractères (16 alphanumériques + 8 chiffres)
const generateSecretCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let secretCode = "";

    for (let i = 0; i < 16; i++) {
        secretCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const numericPart = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 chiffres
    return secretCode + numericPart; // 24 caractères
};

// ✅ Fonction pour générer un reçu PDF
const generateReceiptPDF = (transfer) => {
    return new Promise((resolve, reject) => {
        const directoryPath = "./receipts";

        // ✅ Vérifier si le dossier existe, sinon le créer
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }

        const filePath = `${directoryPath}/receipt_${transfer.secretCode}.pdf`;
        const doc = new PDFDocument();

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc.fontSize(16).text("Reçu de Transfert Interville", { align: "center" });
        doc.moveDown();

        doc.fontSize(12).text(`Expéditeur : ${transfer.senderFirstName} ${transfer.senderLastName}`);
        doc.text(`Téléphone : ${transfer.senderPhone}`);
        doc.text(`Ville d'envoi : ${transfer.senderCity.name}`);
        doc.moveDown();

        doc.text(`Bénéficiaire : ${transfer.receiverName}`);
        doc.text(`Téléphone : ${transfer.receiverPhone}`);
        doc.text(`Ville de retrait : ${transfer.receiverCity.name}`);
        doc.moveDown();

        doc.text(`Montant envoyé : ${transfer.amount} XOF`);
        doc.text(`Commission : ${transfer.commission} XOF`);
        doc.text(`Taxe : ${transfer.tax} XOF`);
        doc.text(`Montant total payé : ${transfer.totalCost} XOF`);
        doc.moveDown();

        doc.text(`Code Secret : ${transfer.secretCode}`, { bold: true });
        doc.end();

        writeStream.on("finish", () => resolve(filePath));
        writeStream.on("error", (err) => reject(err));
    });
};

// ✅ Fonction principale pour créer un transfert interville




export const createInterCityTransfer = async (req, res) => {
  try {
    console.log("🔹 Début du transfert interville...");

    const {
      senderFirstName,
      senderLastName,
      senderPhone,
      senderCity,
      receiverName,
      receiverPhone,
      receiverCity,
      amount,
      deductFeesFromAmount
    } = req.body;

    if (
      !senderFirstName || !senderLastName || !senderPhone || !senderCity ||
      !receiverName || !receiverPhone || !receiverCity || !amount
    ) {
      return res.status(400).json({ msg: "Tous les champs sont requis." });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ msg: "Montant invalide." });
    }

    const senderCityExists = await City.findById(senderCity);
    const receiverCityExists = await City.findById(receiverCity);
    if (!senderCityExists || !receiverCityExists) {
      return res.status(400).json({ msg: "Ville d'envoi ou de retrait invalide." });
    }

    // Calcul des frais
    const { commission, tax } = calculateFees(numericAmount);
    let finalAmount = numericAmount;
    let totalCost = numericAmount + commission + tax;
    if (deductFeesFromAmount) {
      finalAmount = numericAmount - commission - tax;
      totalCost = numericAmount;
    }
    if (finalAmount <= 0) {
      return res.status(400).json({ msg: "Montant final invalide après déduction des frais." });
    }

    // Trouver la caisse du caissier connecté
    const senderCashRegister = await CashRegister.findOne({
      cashier: req.user._id,
      status: "open"
    }).populate('supervisor');

    if (!senderCashRegister || senderCashRegister.supervisor.city.toString() !== senderCity) {
      return res.status(400).json({ msg: "Caisse d'envoi introuvable ou incohérente." });
    }

    // Vérifier que la caisse a suffisamment de fonds pour encaisser
    senderCashRegister.currentBalance += totalCost; // Dépôt du client
    await senderCashRegister.save();

    // 🧾 Enregistrer le dépôt dans CashMovement
    await CashMovement.create({
      cashRegister: senderCashRegister._id,
      type: "deposit",
      amount: totalCost,
      performedBy: req.user._id,
      note: `Dépôt client pour transfert interville vers ${receiverCityExists.name}`,
      clientFirstName: senderFirstName,
      clientPhone: senderPhone,
      operationType: "guichet",
      date: new Date(),
    });

    // Génération du code secret
    const secretCode = generateSecretCode();

    // 🔥 Enregistrer le transfert en base
    const newTransfer = new InterCityTransfer({
      senderFirstName,
      senderLastName,
      senderPhone,
      senderCity,
      receiverName,
      receiverPhone,
      receiverCity,
      amount: finalAmount,
      commission,
      tax,
      totalCost,
      secretCode,
      status: "pending",
      createdBy: req.user._id,
      cashRegister: senderCashRegister._id // ✅ Enregistrement de la caisse liée
    });
    await newTransfer.save();

    console.log("✅ Transfert enregistré avec succès.");

    // 🔔 Envoyer SMS
    await sendSMS(senderPhone, `✅ Transfert interville validé.\nMontant: ${finalAmount} XOF.\n🔐 Code Secret: ${secretCode}`);
    await sendSMS(receiverPhone, `📥 Vous avez reçu un transfert interville de ${finalAmount} XOF.\n🔐 Code: ${secretCode}`);

    res.status(201).json({
      msg: "Transfert effectué avec succès.",
      secretCode,
      totalCost,
    });

  } catch (error) {
    console.error("❌ Erreur transfert interville :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};






// ✅ Effectuer un dépôt pour un utilisateur


export const depositForUser = async (req, res) => {
  try {
    const { phone, amount, applyCommission } = req.body;
    const cashierId = req.user._id;

    console.log("🔹 Début du dépôt...");
    console.log("📞 Téléphone utilisateur :", phone);
    console.log("💰 Montant :", amount);
    console.log("🧾 Appliquer commission :", applyCommission);

    if (!phone || !amount || amount <= 0) {
      return res.status(400).json({ msg: "Données invalides." });
    }

    const user = await User.findOne({ phone });
    if (!user || user.role !== "user") {
      console.warn("⚠️ Ce compte n'est pas autorisé à recevoir un dépôt.");
      return res.status(400).json({ msg: "Ce compte n'est pas autorisé à recevoir un dépôt." });
    }

    // ✅ Recherche de la caisse du caissier
    const cashRegister = await CashRegister.findOne({ cashier: cashierId, status: "open", isActive: true });

    if (!cashRegister) {
      console.warn("⚠️ Aucune caisse active ouverte.");
      return res.status(400).json({ msg: "Aucune caisse active ouverte." });
    }

    // ✅ Calcul des frais (ici aucun)
    const commission = 0;
    const tax = 0;
    const netAmount = amount;

    console.log("✅ [FEE CALCULATOR] Montant:", amount, "| Commission:", commission, "| Taxe:", tax);
    console.log("💵 NetAmount (Montant après frais) :", netAmount);

    // ✅ Mise à jour des soldes
    cashRegister.currentBalance += netAmount; // L’argent entre dans la caisse
    cashRegister.totalDeposits += 1;
    user.virtualAccount.balance += netAmount;

    // ✅ Enregistrement de la transaction utilisateur
    const transaction = await UserTransaction.create({
      user: user._id,
      cashier: cashierId,
      cashRegister: cashRegister._id,
      type: "deposit",
      amount,
      netAmount,
      commissionAmount: commission,
      taxAmount: tax,
      applyCommission
    });

    console.log("✅ Transaction enregistrée :", transaction);

    // ✅ Enregistrement du mouvement dans la caisse (CashMovement)
    await CashMovement.create({
      cashRegister: cashRegister._id,
      type: "deposit", // Mouvement entrant pour la caisse
      amount: netAmount,
      performedBy: cashierId,
      date: new Date(),
      note: "Dépôt pour l’utilisateur",
      clientFirstName: user.name,
      clientPhone: user.phone,
    });

    await cashRegister.save();
    await user.save();

    // ✅ Envoi d'un SMS de notification au client
    try {
      await sendSMS(
        user.phone,
        `Votre dépôt de ${amount} XOF a été crédité sur votre compte. Nouveau solde : ${user.virtualAccount.balance} XOF. Merci d'utiliser notre service.`
      );
      console.log("📤 SMS envoyé au :", user.phone);
    } catch (smsError) {
      console.error("❌ Erreur lors de l'envoi du SMS :", smsError);
    }

    console.log("✅ Dépôt terminé avec succès !");
    return res.status(200).json({ msg: "Dépôt effectué avec succès.", newBalance: user.virtualAccount.balance });

  } catch (error) {
    console.error("❌ Erreur lors du dépôt :", error);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};





// ✅ Effectuer un retrait pour un utilisateur




export const withdrawForUser = async (req, res) => {
  try {
    let { phone, amount, applyCommission } = req.body;
    
    // Supprimer les espaces dans le numéro de téléphone et le montant
    phone = phone.replace(/\s/g, "");
    amount = parseFloat(String(amount).replace(/\s/g, ""));
    
    const cashierId = req.user._id;

    if (!phone || !amount || amount <= 0) {
      return res.status(400).json({ msg: "Données invalides." });
    }

    // Vérifier que l'utilisateur existe et qu'il a le rôle "user"
    const user = await User.findOne({ phone });
    if (!user || user.role !== "user") {
      return res.status(400).json({ msg: "Ce compte n'est pas autorisé à effectuer un retrait." });
    }

    // Trouver la caisse ouverte du caissier
    const cashRegister = await CashRegister.findOne({ cashier: cashierId, status: "open", isActive: true });
    if (!cashRegister) {
      return res.status(400).json({ msg: "Aucune caisse ouverte." });
    }

    // Calcul de la commission et de la taxe si activé
    const { commission, tax } = applyCommission ? calculateFees(amount) : { commission: 0, tax: 0 };
    const totalDebit = amount + commission + tax;

    // Vérifier que l'utilisateur a assez de fonds sur son compte virtuel
    if (user.virtualAccount.balance < totalDebit) {
      return res.status(400).json({ msg: "Solde insuffisant sur le compte virtuel." });
    }

    // Vérifier que la caisse a assez de liquidité
    if (cashRegister.currentBalance < amount) {
      return res.status(400).json({ msg: "Solde insuffisant dans la caisse pour effectuer ce retrait." });
    }

    // Mise à jour du solde du compte virtuel de l'utilisateur
    user.virtualAccount.balance -= totalDebit;

    // Mise à jour du solde de la caisse : on ne débite que le montant principal (le transfert)
    cashRegister.currentBalance -= amount;

    // Enregistrer la transaction dans UserTransaction
    await UserTransaction.create({
      user: user._id,
      cashier: cashierId,
      cashRegister: cashRegister._id,
      type: "withdrawal",
      amount,
      netAmount: amount,
      commissionAmount: commission,
      taxAmount: tax,
      applyCommission,
    });

    // Enregistrement du mouvement dans CashMovement
    await CashMovement.create({
      cashRegister: cashRegister._id,
      type: "withdrawal", // Mouvement sortant pour la caisse
      amount: amount,
      performedBy: cashierId,
      date: new Date(),
      note: "Retrait pour l’utilisateur",
      clientFirstName: user.name,
      clientPhone: user.phone,
    });

    await cashRegister.save();
    await user.save();

    return res.status(200).json({
      msg: "Retrait effectué avec succès.",
      newBalance: user.virtualAccount.balance
    });
  } catch (error) {
    console.error("❌ Erreur lors du retrait :", error);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};

  


// ✅ Récupérer l'historique des transactions du caissier


export const getCashierTransactions = async (req, res) => {
  try {
    const cashierId = req.user._id;

    // Trouver la caisse ouverte du caissier
    const cashRegister = await CashRegister.findOne({
      cashier: cashierId,
      status: "open",
      isActive: true
    });

    if (!cashRegister) {
      return res.status(400).json({ msg: "Aucune caisse ouverte pour ce caissier." });
    }

    // Récupérer les 100 dernières transactions effectuées PAR le caissier sur sa caisse
    const transactions = await CashMovement.find({
      cashRegister: cashRegister._id,
      performedBy: cashierId
    })
      .populate("performedBy", "name phone")
      .sort({ date: -1 })
      .limit(100);

    return res.status(200).json({
      transactions,
      cashRegisterInfo: {
        registerNumber: cashRegister.registerNumber,
        currentBalance: cashRegister.currentBalance,
      },
    });

  } catch (error) {
    console.error("❌ Erreur lors de la récupération des transactions :", error);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};


export const getCashRegisterDetails = async (req, res) => {
    try {
      const cashierId = req.user._id;
  
      // Cherche la caisse ouverte du caissier
      const cashRegister = await CashRegister.findOne({
        cashier: cashierId,
        status: "open",
        isActive: true
      });
  
      if (!cashRegister) {
        return res.status(404).json({ msg: "Aucune caisse ouverte trouvée." });
      }
  
      // Totaux strictement réalisés par le caissier sur CETTE caisse
      const [totalDeposits, totalWithdrawals] = await Promise.all([
        CashMovement.aggregate([
          { $match: { cashRegister: cashRegister._id, type: "deposit", performedBy: cashierId } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        CashMovement.aggregate([
          { $match: { cashRegister: cashRegister._id, type: "withdrawal", performedBy: cashierId } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ])
      ]);
  
      return res.status(200).json({
        initialBalance: cashRegister.initialBalance ?? 0,
        openingAmount: cashRegister.openingAmount ?? 0,
        currentBalance: cashRegister.currentBalance ?? 0,
        totalDeposits: totalDeposits[0]?.total ?? 0,
        totalWithdrawals: totalWithdrawals[0]?.total ?? 0,
      });
  
    } catch (error) {
      console.error("❌ Erreur lors de la récupération de la caisse :", error);
      return res.status(500).json({ msg: "Erreur du serveur." });
    }
};
  
  
 
 
 
  export const getDepositsHistory = async (req, res) => {
    try {
      const cashierId = req.user._id;
      const { page = 1, limit = 20 } = req.query;
  
      // Trouver la caisse ouverte du caissier
      const cashRegister = await CashRegister.findOne({
        cashier: cashierId,
        status: "open",
        isActive: true,
      });
  
      if (!cashRegister) {
        return res.status(400).json({ msg: "Aucune caisse ouverte pour ce caissier." });
      }
  
      // Filtrer par performedBy (le caissier connecté)
      const filter = {
        cashRegister: cashRegister._id,
        type: "deposit",
        performedBy: cashierId,
      };
  
      const totalDeposits = await CashMovement.countDocuments(filter);
  
      const deposits = await CashMovement.find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate({
          path: "performedBy",
          select: "name phone city",
          populate: { path: "city", select: "name" }
        });
  
      return res.status(200).json({
        deposits,
        totalDeposits,
        totalPages: Math.ceil(totalDeposits / limit),
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des dépôts :", error);
      return res.status(500).json({ msg: "Erreur du serveur." });
    }
  };
  
  

 

  export const getWithdrawalsHistory = async (req, res) => {
    try {
      const cashierId = req.user._id;
      const { page = 1, limit = 20 } = req.query;
  
      // Récupérer la caisse ouverte du caissier
      const cashRegister = await CashRegister.findOne({
        cashier: cashierId,
        status: "open",
        isActive: true,
      });
  
      if (!cashRegister) {
        return res.status(400).json({ msg: "Aucune caisse ouverte pour ce caissier." });
      }
  
      // 🎯 FILTRE CORRECT
      const filter = {
        cashRegister: cashRegister._id,
        type: "withdrawal",
        performedBy: cashierId,
        operationType: "guichet", // 🔥 Filtre uniquement les retraits guichet
      };
  
      const totalWithdrawals = await CashMovement.countDocuments(filter);
  
      const withdrawals = await CashMovement.find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate({
          path: "performedBy",
          select: "name phone city",
          populate: { path: "city", select: "name" }
        });
  
      return res.status(200).json({
        withdrawals,
        totalWithdrawals,
        totalPages: Math.ceil(totalWithdrawals / limit),
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des retraits :", error);
      return res.status(500).json({ msg: "Erreur du serveur." });
    }
  };
  



  export const getTotalDepositsWithdrawals = async (req, res) => {
    try {
      const cashierId = req.user._id; // Caissier connecté
  
      // Trouver la caisse ouverte du caissier
      const cashRegister = await CashRegister.findOne({
        cashier: cashierId,
        status: "open",
        isActive: true,
      });
  
      if (!cashRegister) {
        return res.status(400).json({ msg: "Aucune caisse ouverte pour ce caissier." });
      }
  
      // Filtre sur performedBy: cashierId !
      const [totalDeposits, totalWithdrawals] = await Promise.all([
        CashMovement.aggregate([
          {
            $match: {
              cashRegister: cashRegister._id,
              type: "deposit",
              performedBy: cashierId,
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" }
            }
          }
        ]),
        CashMovement.aggregate([
          {
            $match: {
              cashRegister: cashRegister._id,
              type: "withdrawal",
              performedBy: cashierId,
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" }
            }
          }
        ])
      ]);
  
      return res.status(200).json({
        totalDeposits: totalDeposits[0]?.total || 0,
        totalWithdrawals: totalWithdrawals[0]?.total || 0,
      });
  
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des totaux :", error);
      return res.status(500).json({ msg: "Erreur du serveur." });
    }
  };
  
/**
 * ✅ Récupérer tous les transferts interville en attente
 */
export const getPendingTransfers = async (req, res) => {
    try {
        console.log("🔹 Requête reçue pour récupérer les transferts en attente.");
        console.log("👤 Caissier connecté :", req.user);

        // Vérifier si le caissier a un superviseur
        if (!req.user.supervisor) {
            console.warn("⚠️ Ce caissier n'a pas de superviseur !");
            return res.status(400).json({ msg: "Aucun superviseur trouvé pour ce caissier." });
        }

        // 🔍 Charger le superviseur et sa ville
        const supervisor = await User.findById(req.user.supervisor).populate("city");

        if (!supervisor) {
            console.warn("⚠️ Superviseur non trouvé en base !");
            return res.status(400).json({ msg: "Le superviseur n'existe pas." });
        }

        if (!supervisor.city) {
            console.warn("⚠️ Le superviseur n'a pas de ville assignée !");
            return res.status(400).json({ msg: "Le superviseur n'a pas de ville assignée." });
        }

        const cashierCity = supervisor.city._id; // Récupération de la ville du superviseur

        console.log("🏙️ Ville du superviseur utilisée pour chercher les transferts :", cashierCity);

     


        const pendingTransfers = await InterCityTransfer.find({ 
          receiverCity: cashierCity, 
          status: "pending" 
      })
      .populate("receiverCity", "name")     // ✅ Nom de la ville du bénéficiaire
      .populate("senderCity", "name");      // ✅ Nom de la ville de l'expéditeur
      

        console.log("📋 Nombre de transferts en attente trouvés :", pendingTransfers.length);

        res.status(200).json(pendingTransfers);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des transferts en attente :", error);
        res.status(500).json({ msg: "Erreur serveur lors de la récupération des transferts." });
    }
};



/**
 * ✅ Payer un transfert et changer son statut à "completed"
 */


export const payTransfer = async (req, res) => {
  try {
    const transferId = req.params.id;
    const { secretCode } = req.body;

    // Récupérer le transfert
    // const transfer = await InterCityTransfer.findById(transferId);

    // Récupérer le transfert AVEC la ville d'origine peuplée
const transfer = await InterCityTransfer.findById(transferId)
.populate({
  path: "senderCity",
  select: "name"
});



    if (!transfer) {
      return res.status(404).json({ msg: "Transfert non trouvé." });
    }
    if (transfer.status !== "pending") {
      return res.status(400).json({ msg: "Transfert déjà traité ou annulé." });
    }

    // Vérifier code secret si besoin
    if (secretCode && transfer.secretCode !== secretCode) {
      return res.status(400).json({ msg: "Code secret invalide." });
    }

    // Trouver la caisse de paiement (caissier connecté)
    const receiverCashRegister = await CashRegister.findOne({
      cashier: req.user._id,
      status: "open"
    });
    if (!receiverCashRegister) {
      return res.status(400).json({ msg: "Aucune caisse ouverte pour le paiement." });
    }

    // Vérifier le solde suffisant
    if (receiverCashRegister.currentBalance < transfer.amount) {
      console.log("Solde actuel de la caisse de paiement :", receiverCashRegister.currentBalance);
      console.log("Montant du transfert à payer :", transfer.amount);
      return res.status(400).json({ msg: "Solde insuffisant dans la caisse pour le retrait." });
    }

    // Débiter la caisse du montant à payer
    receiverCashRegister.currentBalance -= transfer.amount;

    // ENREGISTRER DANS CASHMOVEMENT au lieu du push :
    await CashMovement.create({
      cashRegister: receiverCashRegister._id,
      type: "withdrawal",
      amount: transfer.amount,
      performedBy: req.user._id,
      date: new Date(),
      note: `Paiement du transfert interville (code: ${transfer.secretCode}) — Provenance: ${transfer.senderCity?.name || "Ville inconnue"}`,
      clientFirstName: transfer.receiverName,
      clientPhone: transfer.receiverPhone
    });

    // Marquer le transfert comme payé
    transfer.status = "completed";
    transfer.completedAt = new Date();

    await receiverCashRegister.save();
    await transfer.save();

    // ✅ Notification SMS au sender
    const senderMessage = `Retrait effectué ! ${transfer.receiverName} a retiré ${transfer.amount} XOF. Merci d'utiliser notre service.`;
    await sendSMS(transfer.senderPhone, senderMessage);

    return res.status(200).json({ msg: "Transfert payé avec succès.", transfer });
  } catch (error) {
    console.error("Erreur lors du paiement du transfert :", error);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};



 // Annuler un transfert et changer son statut à "cancelled"


export const cancelTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🟢 Requête d'annulation reçue pour l'ID :", id);

    const transfer = await InterCityTransfer.findById(id);
    if (!transfer) {
      console.log("❌ Transfert introuvable pour cet ID.");
      return res.status(404).json({ msg: "Transfert non trouvé." });
    }

    if (transfer.status !== "pending") {
      console.log("⚠️ Statut non annulable :", transfer.status);
      return res.status(400).json({ msg: "Ce transfert ne peut pas être annulé." });
    }

    // 🔍 Trouver le superviseur de la ville de réception (caisse physique)
    const supervisor = await User.findOne({ role: "supervisor", city: transfer.receiverCity });
    if (!supervisor) {
      console.log("❌ Aucun superviseur pour la ville :", transfer.receiverCity);
      return res.status(404).json({ msg: "Superviseur introuvable pour la ville de réception." });
    }

    // 🔍 Trouver la caisse ouverte
    const cashRegister = await CashRegister.findOne({
      supervisor: supervisor._id,
      status: "open"
    });
    if (!cashRegister) {
      console.log("❌ Aucune caisse ouverte pour le superviseur :", supervisor._id);
      return res.status(404).json({ msg: "Aucune caisse ouverte trouvée." });
    }

    // ✅ Débiter la caisse du montant
    if (cashRegister.currentBalance < transfer.amount) {
      return res.status(400).json({ msg: "Solde insuffisant dans la caisse pour l'annulation." });
    }
    cashRegister.currentBalance -= transfer.amount;
    await cashRegister.save();
    console.log("💸 Caisse débitée de :", transfer.amount);

    // 🧾 Mouvement de sortie (débit)
    await CashMovement.create({
      cashRegister: cashRegister._id,
      type: "withdrawal",
      amount: transfer.amount,
      performedBy: req.user._id,
      date: new Date(),
      note: `Débit suite à annulation transfert (code: ${transfer.secretCode})`,
      clientFirstName: transfer.receiverName,
      clientPhone: transfer.receiverPhone,
      operationType: "intercity_cancel",
      reference: transfer._id,
    });

    // 🔄 Remboursement du compte virtuel
    const senderUser = await User.findById(transfer.createdBy);
    if (senderUser?.role === "user") {
      if (!senderUser.virtualAccount) {
        senderUser.virtualAccount = { balance: 0 };
      }
      senderUser.virtualAccount.balance += transfer.amount;
      await senderUser.save();
      console.log("✅ Compte virtuel recrédité de :", transfer.amount);

      await CashMovement.create({
        cashRegister: null,
        type: "deposit",
        amount: transfer.amount,
        performedBy: req.user._id,
        date: new Date(),
        note: `💰 Remboursement virtuel (annulation transfert ${transfer.secretCode})`,
        clientFirstName: senderUser.name,
        clientPhone: senderUser.phone,
        operationType: "intercity_auto_refund",
        reference: transfer._id,
      });
    }

    // ✅ Statut du transfert
    transfer.status = "cancelled";
    await transfer.save();

    console.log("📄 Transfert annulé avec succès.");
    return res.status(200).json({ msg: "✅ Transfert annulé et remboursé avec succès.", transfer });

  } catch (error) {
    console.error("❌ Erreur lors de l'annulation du transfert :", error);
    res.status(500).json({ msg: "Erreur serveur lors de l'annulation du transfert." });
  }
};



const formatPhoneNumber = (phone) => {
  if (phone.startsWith("+227")) return phone;
  if (phone.startsWith("0")) return `+227${phone.slice(1)}`;
  return `+227${phone}`;
};

// ✅ Contrôleur pour trouver un utilisateur par téléphone
export const findUserByPhone = async (req, res) => {
  try {
    const formattedPhone = formatPhoneNumber(req.params.phone);
    const user = await User.findOne({ phone: formattedPhone }).select("name phone");

    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non trouvé." });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("❌ Erreur lors de la recherche de l'utilisateur :", error);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};







export const getTotalInterCityTransfers = async (req, res) => {
  try {
    const cashierId = req.user._id;

    // 🔎 Récupère la caisse ouverte du caissier
    const openCashRegister = await CashRegister.findOne({
      cashier: cashierId,
      status: "open",
      isActive: true
    });

    if (!openCashRegister) {
      // ✅ Si aucune caisse ouverte → tout à zéro
      return res.status(200).json({ completed: 0, pending: 0 });
    }

    // 🔍 Vérifie que la ville du caissier est connue
    const cashierCityId = req.user.city;
    if (!cashierCityId) {
      return res.status(400).json({ msg: "Ville du caissier inconnue." });
    }

    // ✅ Montant des transferts interville à retirer dans la ville du caissier, pour cette caisse
    const [completed, pending] = await Promise.all([
      InterCityTransfer.aggregate([
        {
          $match: {
            receiverCity: cashierCityId,
            cashRegister: openCashRegister._id,
            status: "completed"
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      InterCityTransfer.aggregate([
        {
          $match: {
            receiverCity: cashierCityId,
            cashRegister: openCashRegister._id,
            status: "pending"
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    res.status(200).json({
      completed: completed[0]?.total || 0,
      pending: pending[0]?.total || 0
    });

  } catch (error) {
    console.error("❌ Erreur lors du calcul des transferts inter-ville :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};



// export const getInterCityTransfersHistory = async (req, res) => {
//   try {
//     // DEBUG : afficher la ville du caissier connecté
//     console.log("👀 [DEBUG] Ville du caissier connecté :", req.user.city);

//     const userCityId = req.user.city;

//     if (!userCityId) {
//       console.log("🚨 Ville absente dans req.user !");
//       return res.status(400).json({ msg: "La ville de l'utilisateur n'est pas renseignée." });
//     }

//     // 🔥 On affiche tous les transferts à retirer dans la ville du caissier (ville de réception)
//     const transfers = await InterCityTransfer.find({ receiverCity: userCityId })
//       .populate("receiverCity", "name")
//       .populate("senderCity", "name")
//       .sort({ createdAt: -1 });

//     // LOG pour compter et vérifier ce qui est trouvé
//     console.log(`✅ [DEBUG] Transferts interville trouvés pour la ville ${userCityId}: ${transfers.length}`);

//     res.json(transfers);
//   } catch (error) {
//     console.error("❌ Erreur récupération historique inter-ville :", error);
//     res.status(500).json({ msg: "Erreur serveur" });
//   }
// };


export const getInterCityTransfersHistory = async (req, res) => {
  try {
    const cashierId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    // 🔍 Trouver la caisse ouverte du caissier connecté
    const cashRegister = await CashRegister.findOne({
      cashier: cashierId,
      status: "open",
      isActive: true,
    });

    if (!cashRegister) {
      return res.status(400).json({ msg: "Aucune caisse ouverte pour ce caissier." });
    }

    // 🎯 Filtrer les transferts interville liés à cette caisse
    const filter = {
      cashRegister: cashRegister._id,
    };

    const totalTransfers = await InterCityTransfer.countDocuments(filter);

    const transfers = await InterCityTransfer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("receiverCity", "name")
      .populate("senderCity", "name");

    return res.status(200).json({
      transfers,
      totalTransfers,
      totalPages: Math.ceil(totalTransfers / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des transferts interville :", error);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};





export const modifyInterCityTransfer = async (req, res) => {
  try {
    const transferId = req.params.id;
    const { receiverName, receiverPhone, receiverCity } = req.body;

    // 1. Vérifier que le transfert existe
    const transfer = await InterCityTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ msg: "❌ Transfert introuvable." });
    }

    // 2. Vérifier le statut
    if (transfer.status !== "pending") {
      return res.status(400).json({ msg: "⚠️ Seuls les transferts en attente peuvent être modifiés." });
    }

    // 3. Vérifier qu’il y a un superviseur dans la ville choisie
    const supervisor = await User.findOne({ role: "supervisor", city: receiverCity });
    if (!supervisor) {
      return res.status(404).json({ msg: "❌ Aucun superviseur trouvé pour cette ville." });
    }

    // 4. Vérifier qu’une caisse est ouverte pour ce superviseur
    const openCashRegister = await CashRegister.findOne({
      supervisor: supervisor._id,
      status: "open"
    });

    if (!openCashRegister) {
      return res.status(404).json({ msg: "❌ La ville sélectionnée ne dispose d'aucune caisse ouverte." });
    }

    // 5. Mettre à jour les champs autorisés
    if (receiverName) transfer.receiverName = receiverName;
    if (receiverPhone) transfer.receiverPhone = receiverPhone;
    if (receiverCity) transfer.receiverCity = receiverCity;

    await transfer.save();

    res.status(200).json({ msg: "✅ Transfert mis à jour avec succès.", transfer });

  } catch (error) {
    console.error("❌ Erreur modification transfert :", error);
    res.status(500).json({ msg: "❌ Erreur serveur lors de la modification du transfert." });
  }
};
