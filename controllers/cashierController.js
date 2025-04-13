
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
      console.log("🔹 Début du processus de transfert interville...");

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

      if (!senderFirstName || !senderLastName || !senderPhone || !senderCity || 
          !receiverName || !receiverPhone || !receiverCity || !amount) {
          return res.status(400).json({ msg: "Tous les champs sont requis." });
      }

      // Conversion du montant en nombre
      const numericAmount = parseFloat(amount);

      // Vérifier si les villes existent
      const senderCityExists = await City.findById(senderCity);
      if (!senderCityExists) {
          return res.status(400).json({ msg: "Ville d'envoi invalide." });
      }
      const receiverCityExists = await City.findById(receiverCity);
      if (!receiverCityExists) {
          return res.status(400).json({ msg: "Ville de retrait invalide." });
      }

      // Calcul des frais (commission et taxe)
      const { commission, tax } = calculateFees(numericAmount);
      let finalAmount = numericAmount;
      let totalCost = numericAmount + commission + tax;
      if (deductFeesFromAmount) {
          finalAmount = numericAmount - commission - tax;
          totalCost = numericAmount;
      }
      if (finalAmount <= 0) {
          return res.status(400).json({ msg: "Le montant après déduction des frais est invalide." });
      }

      // ----------------------------
      // Impact sur les caisses
      // ----------------------------

      // Pour la caisse d'envoi, on utilise celle du caissier connecté.
      const senderCashRegister = await CashRegister.findOne({ cashier: req.user._id, status: "open" }).populate('supervisor');
      if (!senderCashRegister) {
          return res.status(400).json({ msg: "Aucune caisse ouverte pour l'expéditeur (caissier)." });
      }
      // Vérifier que la caisse du caissier appartient bien à la ville d'envoi
      if (senderCashRegister.supervisor.city.toString() !== senderCity) {
          return res.status(400).json({ msg: "La caisse du caissier n'appartient pas à la ville d'envoi." });
      }
      if (senderCashRegister.currentBalance < totalCost) {
          console.log("Solde de la caisse d'envoi:", senderCashRegister.currentBalance);
          console.log("Total coût du transfert:", totalCost);
          return res.status(400).json({ msg: "Solde insuffisant dans la caisse de l'expéditeur." });
      }

      // Pour la caisse de réception, on récupère la caisse via le superviseur de la ville de réception.
      const receiverSupervisor = await User.findOne({ role: "supervisor", city: receiverCity });
      if (!receiverSupervisor) {
          return res.status(400).json({ msg: "Aucun superviseur trouvé pour la ville de réception." });
      }
      const receiverCashRegister = await CashRegister.findOne({ supervisor: receiverSupervisor._id, status: "open" });
      if (!receiverCashRegister) {
          return res.status(400).json({ msg: "Aucune caisse ouverte pour la ville de réception." });
      }

      // Mise à jour des caisses
// Mise à jour de la caisse d'envoi
// Créditer la caisse de l'expéditeur du montant total encaissé (transfert + frais)
senderCashRegister.currentBalance += totalCost;
console.log("Caisse d'envoi créditée du montant total =", totalCost);

// Enregistrer une transaction pour la caisse d'envoi
senderCashRegister.transactions.push({
    type: "deposit",
    amount: totalCost,
    performedBy: req.user._id,
    date: new Date(),
    note: `Transfert interville (création) : crédit de ${totalCost} (montant transfert + frais)`
});




      // Enregistrer les transactions
      senderCashRegister.transactions.push({
          type: "withdrawal",
          amount: totalCost,
          performedBy: req.user._id,
          date: new Date(),
          note: `Transfert interville vers ${receiverCityExists.name}`
      });
      receiverCashRegister.transactions.push({
          type: "deposit",
          amount: finalAmount,
          performedBy: req.user._id,
          date: new Date(),
          note: `Transfert interville en provenance de ${senderCityExists.name}`
      });

      // Sauvegarder les mises à jour sur les caisses
      await senderCashRegister.save();
      if (senderCashRegister._id.toString() !== receiverCashRegister._id.toString()) {
          await receiverCashRegister.save();
      }

      console.log("Nouveau solde de la caisse d'envoi :", senderCashRegister.currentBalance);
      if (senderCashRegister._id.toString() !== receiverCashRegister._id.toString()) {
          console.log("Nouveau solde de la caisse de réception :", receiverCashRegister.currentBalance);
      }

      // ----------------------------
      // Fin de la partie caisse
      // ----------------------------

      // Génération du code secret
      const secretCode = generateSecretCode();

      // Création du transfert en base de données
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
          createdBy: req.user._id  // 🔥 Caissier connecté
      });

      await newTransfer.save();

      // Génération du reçu en PDF
      const receiptPath = await generateReceiptPDF(newTransfer);

      // Envoi des notifications SMS
     // await sendSMS(senderPhone, `Votre transfert interville est validé.\nMontant: ${finalAmount} XOF\nCode Secret: ${secretCode}.`);
     // await sendSMS(receiverPhone, `Vous avez reçu un transfert interville.\nMontant: ${finalAmount} XOF\nCode Secret: ${secretCode}.`);

      // Réponse avec le chemin du reçu PDF
      res.status(201).json({
          msg: "Transfert effectué avec succès.",
          secretCode,
          totalCost,
          receiptUrl: receiptPath
      });

  } catch (error) {
      console.error("❌ Erreur lors du transfert interville :", error);
      res.status(500).json({ msg: "Erreur du serveur." });
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

  


        // ✅ Recherche de la caisse
        const cashRegister = await CashRegister.findOne({ cashier: cashierId, status: "open", isActive: true });

        if (!cashRegister) {
            console.warn("⚠️ Aucune caisse active ouverte.");
            return res.status(400).json({ msg: "Aucune caisse active ouverte." });
        }

        // ✅ Calcul des frais
        // const { commission, tax } = applyCommission ? calculateFees(amount) : { commission: 0, tax: 0 };
        // const netAmount = amount - commission - tax;

        // ✅ Pas de commission à prélever pour un dépôt vers un utilisateur (User)
        const commission = 0;
        const tax = 0;
        const netAmount = amount; // Le montant total est crédité sur le compte de l'utilisateur


        console.log("✅ [FEE CALCULATOR] Montant:", amount, "| Commission:", commission, "| Taxe:", tax);
        console.log("💵 NetAmount (Montant après frais) :", netAmount);

        // ✅ Mise à jour des soldes
        cashRegister.currentBalance += netAmount;
        cashRegister.totalDeposits += 1;
        user.virtualAccount.balance += netAmount;

        // ✅ Enregistrement de la transaction
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

        // ✅ Ajout correct de la transaction au cashRegister
        cashRegister.transactions.push({
            performedBy: cashierId, // 🔹 Caissier qui effectue l'opération
            amount: netAmount, // 🔹 Montant net après frais
            type: "deposit" // 🔹 Type de transaction
        });

        console.log("📋 Transactions dans cashRegister après ajout :", cashRegister.transactions);

        await cashRegister.save();
        await user.save();


        // ✅ Envoi d'un SMS de notification au client
      try {
        await sendSMS(user.phone, `Votre dépôt de ${amount} XOF a été crédité sur votre compte. Nouveau solde : ${user.virtualAccount.balance} XOF. Merci d'utiliser notre service.`);
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
    const cashRegister = await CashRegister.findOne({ cashier: cashierId, status: "open" });
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
  
      // 🔹 Trouver la caisse ouverte du caissier
      const cashRegister = await CashRegister.findOne({ cashier: cashierId, status: "open" })
        .populate("transactions.performedBy", "name phone") // ✅ Inclut les infos du caissier
        .sort({ "transactions.date": -1 }); // ✅ Trie les transactions par date décroissante
  
      if (!cashRegister) {
        return res.status(400).json({ msg: "Aucune caisse ouverte pour ce caissier." });
      }
  
      return res.status(200).json({
        transactions: cashRegister.transactions.slice(0, 100), // ✅ Renvoie les 100 dernières transactions
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
  
      const cashRegister = await CashRegister.findOne({ cashier: cashierId, status: "open" });
  
      if (!cashRegister) {
        return res.status(404).json({ msg: "Aucune caisse ouverte trouvée." });
      }
  
      console.log("✅ [BACKEND] Caisse récupérée :", cashRegister);
  
      return res.status(200).json({
        initialBalance: cashRegister.initialBalance ?? 0,
        openingAmount: cashRegister.openingAmount ?? 0,
        currentBalance: cashRegister.currentBalance ?? 0,
        totalDeposits: cashRegister.totalDeposits ?? 0,
        totalWithdrawals: cashRegister.totalWithdrawals ?? 0,
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
  
      const deposits = await UserTransaction.find({ cashier: cashierId, type: "deposit" })
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate({
          path: "user",
          select: "name phone city",
          populate: { path: "city", select: "name" } // 🔥 Ville du client
        })
        .populate({
          path: "cashier",
          select: "name phone city",
          populate: { path: "city", select: "name" } // 🔥 Ville du caissier
        });
  
      return res.status(200).json(deposits);
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des dépôts :", error);
      return res.status(500).json({ msg: "Erreur du serveur." });
    }
  };
  

  // export const getWithdrawalsHistory = async (req, res) => {
  //   try {
  //     const cashierId = req.user._id;
  //     const { page = 1, limit = 20 } = req.query;
  
  //     const withdrawals = await UserTransaction.find({ cashier: cashierId, type: "withdrawal" })
  //       .sort({ date: -1 })
  //       .limit(200)
  //       .skip((page - 1) * limit)
  //       .limit(parseInt(limit))
  //       .populate("user", "name phone")
  //       .populate("cashier", "name");
  
  //     return res.status(200).json(withdrawals);
  //   } catch (error) {
  //     console.error("❌ Erreur lors de la récupération des retraits :", error);
  //     return res.status(500).json({ msg: "Erreur du serveur." });
  //   }
  // };


  // ✅ Récupérer le total des dépôts et retraits du caissier


  export const getWithdrawalsHistory = async (req, res) => {
    try {
      const cashierId = req.user._id;
      const { page = 1, limit = 20 } = req.query;
  
      const withdrawals = await UserTransaction.find({ cashier: cashierId, type: "withdrawal" })
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "name phone")
      .populate({
        path: "cashier",
        select: "name city",
        populate: {
          path: "city",
          select: "name"
        }
      });
    
  
      return res.status(200).json(withdrawals);
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des retraits :", error);
      return res.status(500).json({ msg: "Erreur du serveur." });
    }
  };
  





  export const getTotalDepositsWithdrawals = async (req, res) => {
    try {
      const cashierId = req.user._id; // 📌 Caissier connecté
  
      // 🔍 Compter les transactions du caissier
      const totalDeposits = await UserTransaction.aggregate([
        { $match: { cashier: cashierId, type: "deposit" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
  
      const totalWithdrawals = await UserTransaction.aggregate([
        { $match: { cashier: cashierId, type: "withdrawal" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
  
      return res.status(200).json({
        totalDeposits: totalDeposits.length > 0 ? totalDeposits[0].total : 0,
        totalWithdrawals: totalWithdrawals.length > 0 ? totalWithdrawals[0].total : 0
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
    const { secretCode } = req.body; // si vous souhaitez valider le code secret

    // Récupérer le transfert
    const transfer = await InterCityTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ msg: "Transfert non trouvé." });
    }
    if (transfer.status !== "pending") {
      return res.status(400).json({ msg: "Transfert déjà traité ou annulé." });
    }

    // Optionnel : vérifier que le code secret correspond
    if (secretCode && transfer.secretCode !== secretCode) {
      return res.status(400).json({ msg: "Code secret invalide." });
    }

    // Pour le paiement, on utilise la caisse du caissier connecté (celle qui reçoit le paiement)
    const receiverCashRegister = await CashRegister.findOne({ cashier: req.user._id, status: "open" });
    if (!receiverCashRegister) {
      return res.status(400).json({ msg: "Aucune caisse ouverte pour le paiement." });
    }

    // Vérifier que la caisse dispose des fonds suffisants pour payer le transfert (seulement le montant principal)
    if (receiverCashRegister.currentBalance < transfer.amount) {
      console.log("Solde actuel de la caisse de paiement :", receiverCashRegister.currentBalance);
      console.log("Montant du transfert à payer :", transfer.amount);
      return res.status(400).json({ msg: "Solde insuffisant dans la caisse pour le retrait." });
    }

    // Débiter la caisse du montant principal (le transfert sans frais)
    receiverCashRegister.currentBalance -= transfer.amount;
    receiverCashRegister.transactions.push({
      type: "withdrawal",
      amount: transfer.amount,
      performedBy: req.user._id,
      date: new Date(),
      note: `Paiement du transfert interville (code: ${transfer.secretCode})`
    });

    // Marquer le transfert comme payé
    transfer.status = "completed";
    transfer.completedAt = new Date();

    await receiverCashRegister.save();
    await transfer.save();

      // ✅ Envoyer une notification SMS au sender
        const senderMessage = `✅ Retrait effectué ! ${transfer.receiverName} a retiré ${transfer.amount} XOF. Merci d'utiliser notre service.`;
       await sendSMS(transfer.senderPhone, senderMessage);

    return res.status(200).json({ msg: "Transfert payé avec succès.", transfer });
  } catch (error) {
    console.error("Erreur lors du paiement du transfert :", error);
    return res.status(500).json({ msg: "Erreur du serveur." });
  }
};


/**
 * ✅ Annuler un transfert et changer son statut à "cancelled"
 */
export const cancelTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const transfer = await InterCityTransfer.findById(id);

        if (!transfer) {
            return res.status(404).json({ msg: "Transfert non trouvé." });
        }

        if (transfer.status !== "pending") {
            return res.status(400).json({ msg: "Ce transfert ne peut pas être annulé." });
        }

        transfer.status = "cancelled";
        await transfer.save();

        res.status(200).json({ msg: "❌ Transfert annulé avec succès.", transfer });
    } catch (error) {
        console.error("❌ Erreur lors de l'annulation du transfert :", error);
        res.status(500).json({ msg: "Erreur serveur lors de l'annulation du transfert." });
    }
};





// 📌 Fonction utilitaire pour formater le numéro
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
    const result = await InterCityTransfer.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]);

    const totalAmount = result.length > 0 ? result[0].totalAmount : 0;

    res.json({ totalAmount });
  } catch (error) {
    console.error("❌ Erreur total inter-ville :", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
};



export const getInterCityTransfersHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("📌 ID du caissier connecté :", userId);

    const transfers = await InterCityTransfer.find({ createdBy: userId })
      .populate("receiverCity", "name")
      .sort({ createdAt: -1 });

    console.log("📦 Transferts effectués par ce caissier :", transfers.length);
    res.json(transfers);
  } catch (error) {
    console.error("❌ Erreur récupération historique inter-ville :", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
};






