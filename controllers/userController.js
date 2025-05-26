


import InterCityTransfer from "../models/InterCityTransfer.js";
import User from "../models/User.js";
import City from "../models/City.js";
import { sendSMS } from "../services/smsService.js";
import { calculateFees } from "../utils/feeCalculator.js"; // Assure-toi que cette fonction est bien définie
import CashRegister from "../models/CashRegister.js";
import CashMovement from "../models/CashMovement.js";
import CommissionHistory from "../models/CommissionHistory.js";
import InternalSettlement from "../models/InternalSettlement.js";


// ✅ Générer un code unique
const generateSecretCode = async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let secretCode, existingCode;

    do {
        secretCode = Array(16)
            .fill(null)
            .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
            .join("") + Math.floor(10000000 + Math.random() * 90000000).toString();
        
        existingCode = await InterCityTransfer.findOne({ secretCode });
    } while (existingCode);

    return secretCode;
};

// ✅ Créer un transfert interville




export const refundInterCityTransfer = async (req, res) => {
  try {
    const transferId = req.params.id;
    const userId = req.user._id;

    // Récupérer le transfert
    const transfer = await InterCityTransfer.findById(transferId);
    if (!transfer) return res.status(404).json({ msg: "Transfert introuvable." });
    if (String(transfer.createdBy) !== String(userId)) return res.status(403).json({ msg: "Non autorisé." });
    if (transfer.status !== "pending") return res.status(400).json({ msg: "Déjà traité ou annulé." });

    const user = await User.findById(userId);
    if (!user || !user.virtualAccount) return res.status(404).json({ msg: "Utilisateur ou compte introuvable." });

    // On sécurise le montant à re-créditer
    const refundAmount = Number(transfer.totalCost ?? transfer.amount ?? 0);

    if (isNaN(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({ msg: "Montant de remboursement invalide !" });
    }

    user.virtualAccount.balance += refundAmount;
    await user.save();

    transfer.status = "cancelled";
    transfer.cancelledAt = new Date();
    await transfer.save();

    res.status(200).json({ msg: "Remboursé avec succès.", newBalance: user.virtualAccount.balance });
  } catch (err) {
    console.error("Erreur remboursement transfert :", err);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};











// export const createInterCityTransfer = async (req, res) => {
//   try {
//     console.log("📩 Requête reçue :", req.body);

//     let { 
//       senderFirstName, 
//       senderLastName, 
//       senderPhone, 
//       senderCity, 
//       receiverName, 
//       receiverPhone, 
//       receiverCity, 
//       amount, 
//       deductFeesFromAmount 
//     } = req.body;

//     // 1️⃣ Vérification des champs obligatoires
//     if (!senderFirstName || !senderLastName || !senderPhone || !receiverName || !receiverPhone || !receiverCity || !amount) {
//       return res.status(400).json({ msg: "Tous les champs sont requis." });
//     }

//     // 2️⃣ Conversion et validation du montant
//     amount = parseFloat(amount);
//     if (isNaN(amount) || amount <= 0) {
//       return res.status(400).json({ msg: "Montant invalide. Veuillez entrer un nombre valide." });
//     }

//     // 3️⃣ Vérification de l'utilisateur initiateur
//     const sender = await User.findOne({ phone: senderPhone });
//     if (!sender) {
//       return res.status(404).json({ msg: "Utilisateur initiateur introuvable." });
//     }

//     // 4️⃣ Vérification du compte virtuel
//     if (!sender.virtualAccount || typeof sender.virtualAccount.balance !== "number") {
//       return res.status(400).json({ msg: "Compte virtuel non configuré." });
//     }

//     console.log(`✅ Solde initial de ${sender.name} : ${sender.virtualAccount.balance} XOF`);

//     // 5️⃣ Vérification de la ville de retrait
//     const receiverCityExists = await City.findById(receiverCity);
//     if (!receiverCityExists) {
//       return res.status(400).json({ msg: "Ville de retrait invalide." });
//     }

//     // 6️⃣ Calcul des frais
//     const { commission, tax } = calculateFees(amount);
//     let finalAmount = amount;
//     let totalCost = amount + commission + tax;

//     if (deductFeesFromAmount) {
//       finalAmount = amount - commission - tax;
//       totalCost = amount;
//     }

//     if (finalAmount <= 0) {
//       return res.status(400).json({ msg: "Le montant après déduction des frais est invalide." });
//     }

//     console.log(`✅ [FEE CALCULATOR] Montant: ${amount} | Commission: ${commission} | Taxe: ${tax}`);
//     console.log(`💰 Final Amount: ${finalAmount} | Total Cost: ${totalCost}`);

//     // 7️⃣ Vérification du solde suffisant
//     if (sender.virtualAccount.balance < totalCost) {
//       return res.status(400).json({ msg: "Fonds insuffisants dans le compte virtuel." });
//     }

//     // 8️⃣ Trouver la caisse (via ville de retrait, puisque l'utilisateur est mobile)
//     const senderSupervisor = await User.findOne({ role: "supervisor", city: receiverCity });
//     if (!senderSupervisor) {
//       return res.status(400).json({ msg: "Aucun superviseur trouvé pour la ville de l’expéditeur (retrait)." });
//     }

//     const senderCashRegister = await CashRegister.findOne({
//       supervisor: senderSupervisor._id,
//       status: "open"
//     }).populate('supervisor');

//     if (!senderCashRegister) {
//       return res.status(400).json({ msg: "Aucune caisse ouverte trouvée pour cette ville." });
//     }

//     if (!senderCity) {
//       senderCity = senderCashRegister.supervisor?.city?.toString();
//       console.log("🔄 Ville de l’expéditeur définie automatiquement :", senderCity);
//     }

//     // 9️⃣ Débiter le compte virtuel
//     sender.virtualAccount.balance -= totalCost;
//     await sender.save();

//     console.log(`✅ Nouveau solde de ${sender.name} : ${sender.virtualAccount.balance} XOF`);

//     // 🔟 Génération du code secret
//     const secretCode = await generateSecretCode();
//     console.log(`🔑 Code Secret Généré: ${secretCode}`);

//     // 🔟 Enregistrement du transfert
//     const newTransfer = new InterCityTransfer({
//       senderFirstName,
//       senderLastName,
//       senderPhone,
//       senderCity,
//       receiverName,
//       receiverPhone,
//       receiverCity,
//       amount: finalAmount,
//       commission,
//       tax,
//       totalCost,
//       secretCode,
//       status: "pending",
//       createdBy: sender._id,
//       cashRegister: senderCashRegister._id
//     });

//     await newTransfer.save();
//     console.log("✅ Transfert enregistré en base de données avec succès.");

//     // 1️⃣1️⃣ Crédit de la caisse physique de la ville de retrait
//     const receiverCashRegister = senderCashRegister; // même caisse (ville de retrait)
//     receiverCashRegister.currentBalance += totalCost;

//     await CashMovement.create({
//       cashRegister: receiverCashRegister._id,
//       type: "deposit",
//       amount: totalCost,
//       performedBy: sender._id,
//       date: new Date(),
//       note: `Crédit interville mobile (Transfert de ${senderFirstName} ${senderLastName} pour ${receiverName}) — Code: ${secretCode}`,
//       clientFirstName: receiverName,
//       clientPhone: receiverPhone,
//       reference: newTransfer._id,
//       operationType: "intercity_receive",
//     });

//     await receiverCashRegister.save();

//     // 1️⃣2️⃣ Notifications
//     await sendSMS(senderPhone, `Votre transfert interville est validé.\nMontant: ${finalAmount} XOF\nCode Secret: ${secretCode}.`);
//     await sendSMS(receiverPhone, `Vous avez reçu un transfert interville.\nMontant: ${finalAmount} XOF\nCode Secret: ${secretCode}.`);
//     console.log("📩 SMS envoyés aux parties concernées.");

//     // 1️⃣3️⃣ Réponse
//     res.status(201).json({
//       msg: "Transfert effectué avec succès.",
//       secretCode,
//       totalCost,
//       newBalance: sender.virtualAccount.balance
//     });

//   } catch (error) {
//     console.error("❌ Erreur lors du transfert interville :", error.message, error.stack);
//     res.status(500).json({ msg: "Erreur du serveur." });
//   }
// };



export const createInterCityTransfer = async (req, res) => {
  try {
    console.log("📩 Requête reçue :", req.body);

    let {
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

    if (!senderFirstName || !senderLastName || !senderPhone || !receiverName || !receiverPhone || !receiverCity || !amount) {
      return res.status(400).json({ msg: "Tous les champs sont requis." });
    }

    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ msg: "Montant invalide. Veuillez entrer un nombre valide." });
    }

    const sender = await User.findOne({ phone: senderPhone });
    if (!sender) {
      return res.status(404).json({ msg: "Utilisateur initiateur introuvable." });
    }

    if (!sender.virtualAccount || typeof sender.virtualAccount.balance !== "number") {
      return res.status(400).json({ msg: "Compte virtuel non configuré." });
    }

    const receiverCityExists = await City.findById(receiverCity);
    if (!receiverCityExists) {
      return res.status(400).json({ msg: "Ville de retrait invalide." });
    }

    const { commission, tax } = calculateFees(amount);
    let finalAmount = amount;
    let totalCost = amount + commission + tax;

    if (deductFeesFromAmount) {
      finalAmount = amount - commission - tax;
      totalCost = amount;
    }

    if (finalAmount <= 0) {
      return res.status(400).json({ msg: "Le montant après déduction des frais est invalide." });
    }

    if (sender.virtualAccount.balance < totalCost) {
      return res.status(400).json({ msg: "Fonds insuffisants dans le compte virtuel." });
    }

    const senderSupervisor = await User.findOne({ role: "supervisor", city: receiverCity });
    if (!senderSupervisor) {
      return res.status(400).json({ msg: "Aucun superviseur trouvé pour la ville de retrait." });
    }

    const senderCashRegister = await CashRegister.findOne({
      supervisor: senderSupervisor._id,
      status: "open"
    }).populate('supervisor');

    if (!senderCashRegister) {
      return res.status(400).json({ msg: "Aucune caisse ouverte trouvée pour cette ville." });
    }

    if (!senderCity) {
      senderCity = senderCashRegister.supervisor?.city?.toString();
    }

    sender.virtualAccount.balance -= totalCost;
    await sender.save();

    const secretCode = await generateSecretCode();

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
      createdBy: sender._id,
      isMobileTransfer: true,
      cashRegister: senderCashRegister._id
    });

    await newTransfer.save();

    senderCashRegister.currentBalance += totalCost;
    await senderCashRegister.save();

    await CashMovement.create({
      cashRegister: senderCashRegister._id,
      type: "deposit",
      amount: totalCost,
      performedBy: sender._id,
      date: new Date(),
      note: `Crédit interville mobile (Transfert de ${senderFirstName} ${senderLastName} pour ${receiverName}) — Code: ${secretCode}`,
      clientFirstName: receiverName,
      clientPhone: receiverPhone,
      reference: newTransfer._id,
      operationType: "intercity_receive"
    });

    await CommissionHistory.create({
      transactionType: "intercity",
      referenceId: newTransfer._id,
      referenceModel: "InterCityTransfer",
      user: sender._id,
      city: senderCity,
      amount,
      commission,
      tax,
      description: `Commission générée pour transfert interville mobile.`
    });

    // await InternalSettlement.create({
    //   interCityTransfer: newTransfer._id,
    //   fromCashRegister: null, // aucun guichet d'envoi car c’est mobile
    //   toCashRegister: senderCashRegister._id,
    //   amount: finalAmount,
    //   status: "pending"
    // });

    await sendSMS(senderPhone, `Votre transfert interville est validé.\nMontant: ${finalAmount} XOF\nCode Secret: ${secretCode}.`);
    await sendSMS(receiverPhone, `Vous avez reçu un transfert interville.\nMontant: ${finalAmount} XOF\nCode Secret: ${secretCode}.`);

    res.status(201).json({
      msg: "Transfert effectué avec succès.",
      secretCode,
      totalCost,
      newBalance: sender.virtualAccount.balance
    });

  } catch (error) {
    console.error("❌ Erreur lors du transfert interville :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};



















export const cancelInterCityTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;

    // 1. Charger le transfert
    const transfer = await InterCityTransfer.findById(transferId);
    if (!transfer) return res.status(404).json({ msg: "Transfert introuvable." });
    if (transfer.status !== "pending") return res.status(400).json({ msg: "Transfert déjà traité ou annulé." });

    // 2. Débiter la caisse de la ville de retrait
    const receiverSupervisor = await User.findOne({ role: "supervisor", city: transfer.receiverCity });
    const receiverCashRegister = await CashRegister.findOne({ supervisor: receiverSupervisor._id, status: "open" });
    if (!receiverCashRegister) return res.status(400).json({ msg: "Caisse non trouvée." });

    receiverCashRegister.currentBalance -= transfer.amount;
    await receiverCashRegister.save();

    // 3. Mouvement de caisse
    await CashMovement.create({
      cashRegister: receiverCashRegister._id,
      type: "withdrawal",
      amount: transfer.amount,
      performedBy: req.user._id,
      date: new Date(),
      note: `Annulation transfert interville (code: ${transfer.secretCode})`,
      clientFirstName: transfer.receiverName,
      clientPhone: transfer.receiverPhone,
      reference: transfer._id,
      operationType: "intercity_cancel",
    });

    // 4. Recréditer le compte virtuel de l’expéditeur
    const sender = await User.findOne({ phone: transfer.senderPhone });
    if (sender && sender.virtualAccount) {
      sender.virtualAccount.balance += transfer.amount; // montant net seulement
      await sender.save();
    }

    // 5. Statut du transfert
    transfer.status = "cancelled";
    await transfer.save();

    return res.json({ msg: "Transfert annulé et remboursé avec succès.", newBalance: sender.virtualAccount.balance });
  } catch (err) {
    console.error("❌ Erreur annulation transfert interville:", err);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};






//Modification de la ville de retrait




export const updateInterCityTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { receiverCity, receiverName, receiverPhone, amount } = req.body;

    const transfer = await InterCityTransfer.findById(transferId);
    if (!transfer) return res.status(404).json({ msg: "Transfert introuvable." });
    if (transfer.status !== "pending") return res.status(400).json({ msg: "Transfert déjà traité ou annulé." });

    const cityChanged = transfer.receiverCity.toString() !== receiverCity;
    const amountChanged = transfer.amount !== amount;
    const nameChanged = transfer.receiverName !== receiverName || transfer.receiverPhone !== receiverPhone;

    // ✅ 1. Mise à jour du transfert
    transfer.receiverCity = receiverCity;
    transfer.receiverName = receiverName;
    transfer.receiverPhone = receiverPhone;
    transfer.amount = amount;
    await transfer.save();

    // ✅ 2. Mise à jour des mouvements liés au changement de ville
    const movements = await CashMovement.find({
      reference: transfer._id,     
    });

    for (let movement of movements) {
      const isWithdrawal = movement.type === "withdrawal";
      const cashRegister = await CashRegister.findById(movement.cashRegister);

      // 🔄 Réajustement du solde si le montant a changé
      if (amountChanged) {
        cashRegister.currentBalance += isWithdrawal
          ? movement.amount - amount
          : amount - movement.amount;
        await cashRegister.save();
      }
      await CashMovement.updateOne(
        { _id: movement._id },
        {
          $set: {
            amount,
            clientFirstName: receiverName,
            clientLastName: receiverName,
            clientPhone: receiverPhone,
            note: `Correction : crédit ville changement (code: ${transfer.secretCode})`,
          },
        }
      );
    }

    // ✅ 3. Envoi du SMS de confirmation au client (🟢 dehors du for)
    let message = `Mise à jour de votre transfert (code: ${transfer.secretCode}) :\n`;
    if (cityChanged) message += `• Ville de retrait modifiée ✅\n`;
    if (nameChanged) message += `• Nouveau bénéficiaire : ${receiverName} (${receiverPhone}) ✅\n`;
    if (amountChanged) message += `• Nouveau montant : ${amount.toLocaleString()} XOF ✅\n`;

    await sendSMS(receiverPhone, message.trim());

    res.json({ msg: "✅ Transfert mis à jour avec succès.", transfer });


  } catch (err) {
    console.error("❌ Erreur modification transfert interville:", err);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};



//Reversement “Me renvoyer à moi-même”

export const autoRefundInterCityTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;

    // 1. Charger le transfert
    const transfer = await InterCityTransfer.findById(transferId);
    if (!transfer) return res.status(404).json({ msg: "Transfert introuvable." });
    if (transfer.status !== "pending") return res.status(400).json({ msg: "Transfert déjà traité ou annulé." });

    // 2. Débiter la caisse de la ville de retrait
    const receiverSupervisor = await User.findOne({ role: "supervisor", city: transfer.receiverCity });
    const receiverCashRegister = await CashRegister.findOne({ supervisor: receiverSupervisor._id, status: "open" });
    if (!receiverCashRegister) return res.status(400).json({ msg: "Caisse non trouvée." });

    receiverCashRegister.currentBalance -= transfer.amount;
    await receiverCashRegister.save();

    // 3. Mouvement de caisse
    await CashMovement.create({
      cashRegister: receiverCashRegister._id,
      type: "withdrawal",
      amount: transfer.amount,
      performedBy: req.user._id,
      date: new Date(),
      note: `Reversement auto sur compte mobile (code: ${transfer.secretCode})`,
      clientFirstName: transfer.receiverName,
      clientPhone: transfer.receiverPhone,
      reference: transfer._id,
      operationType: "intercity_auto_refund",
    });

    // 4. Recréditer le compte virtuel de l’expéditeur
    const sender = await User.findOne({ phone: transfer.senderPhone });
    if (sender && sender.virtualAccount) {
      sender.virtualAccount.balance += transfer.amount;
      await sender.save();
    }

    // 5. Statut du transfert
    transfer.status = "cancelled";
    await transfer.save();

    return res.json({ msg: "Transfert remboursé sur votre compte mobile.", newBalance: sender.virtualAccount.balance });
  } catch (err) {
    console.error("❌ Erreur reversement auto transfert interville:", err);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};










  export const updateTransfer = async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
  
      const transfer = await InterCityTransfer.findById(id);
      if (!transfer) return res.status(404).json({ msg: "Transfert non trouvé" });
  
      // 🔒 Sécurité !
    //   if (!transfer.createdBy || transfer.createdBy.toString() !== req.user._id.toString()) {
    //     return res.status(403).json({ msg: "Accès interdit." });
    //   }


    if (!transfer.createdBy || transfer.createdBy.toString() !== req.user._id.toString()) {
        console.log("⛔ IDs ne correspondent pas !");
        return res.status(403).json({ msg: "Accès interdit." });
      }
      
  
      if (transfer.status !== "pending") {
        return res.status(403).json({ msg: "Impossible de modifier ce transfert." });
      }
  
      Object.assign(transfer, updateData);
      await transfer.save();
  
      res.status(200).json({ msg: "Transfert modifié avec succès.", transfer });
    } catch (error) {
      console.error("Erreur modification transfert :", error);
      res.status(500).json({ msg: "Erreur du serveur." });
    }
  };
  

  

export const getUserInterCityTransfers = async (req, res) => {
    try {
      console.log("📥 Requête reçue pour récupérer les transferts interville de l'utilisateur.");
      console.log("👤 Utilisateur connecté :", req.user?.phone || req.user);
  
      const transfers = await InterCityTransfer.find({
    
        senderPhone: req.user.phone
      })
      .sort({ createdAt: -1 })
      .populate("receiverCity", "name"); // ✅ Le bon populate ici
  
  
      console.log(`📦 ${transfers.length} transferts trouvés.`);
      transfers.forEach((t, i) => {
        console.log(`🔹 ${i + 1}. Montant: ${t.amount} | Téléphone: ${t.receiverPhone} | Ville de retrait: ${t.receiverCity?.name || "N/A"} | Statut: ${t.status}`);
      });
  
      res.status(200).json(transfers);
    } catch (error) {
      console.error("❌ Erreur :", error);
      res.status(500).json({ msg: "Erreur lors de la récupération des transferts." });
    }
  };
  


