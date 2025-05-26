import CashRegister from "../models/CashRegister.js";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import ClosingReport from "../models/ClosingReport.js";
import DailyCashierReport from "../models/DailyCashierReport.js";
import InterCityTransfer from "../models/InterCityTransfer.js";
import CashMovement from "../models/CashMovement.js";










// ✅ 1️⃣ Ouvrir une nouvelle caisse (uniquement pour les superviseurs)



export const openCashRegister = async (req, res) => {
  try {
    console.log("📌 Requête reçue : Ouverture de caisse");
    console.log("👤 Utilisateur authentifié :", req.user);

    const { cashierId, openingAmount, initialBalance } = req.body;
    const supervisorId = req.user._id;

    console.log("🔎 Paramètres reçus - Caissier:", cashierId, "| Montant d'ouverture:", openingAmount, "| Solde initial:", initialBalance);

    // ✅ Vérification des champs requis
    if (!cashierId || !openingAmount || !initialBalance) {
      console.log("⚠️ Erreur : Tous les champs sont requis.");
      return res.status(400).json({ msg: "Tous les champs sont requis." });
    }

    // ✅ Validation des montants
    if (openingAmount <= 0 || initialBalance < 0) {
      return res.status(400).json({ msg: "Le montant d'ouverture doit être positif et le solde initial ne peut pas être négatif." });
    }

    // ✅ Vérification de l'existence du caissier
    const cashier = await User.findById(cashierId).populate("city");
    if (!cashier || cashier.role !== "cashier") {
      console.log("❌ Erreur : Caissier non valide ou introuvable.");
      return res.status(400).json({ msg: "Caissier non valide." });
    }

    console.log("✅ Caissier valide :", cashier.name);

    // ✅ Vérification qu'il n'y a pas déjà une caisse ouverte et active pour ce caissier
    const existingCashRegister = await CashRegister.findOne({
      cashier: cashierId, status: "open", isActive: true
    });

    if (existingCashRegister) {
      console.log("❌ Erreur : Ce caissier a déjà une caisse ouverte.");
      return res.status(400).json({ msg: "Erreur : Ce caissier a déjà une caisse ouverte. Veuillez d'abord la fermer avant d'en créer une nouvelle." });
    }

    // ✅ Génération du numéro de caisse
    const cityName = cashier.city ? cashier.city.name : "UnknownCity";
    const registerNumber = `CR-${cityName}-${Date.now()}`;
    console.log("🔢 Numéro de caisse généré :", registerNumber);

    // ✅ Création de la nouvelle caisse (on retire transactions et city)
    const newCashRegister = new CashRegister({
      registerNumber,
      cashier: cashierId,
      supervisor: supervisorId,
      initialBalance,
      openingAmount,
      currentBalance: openingAmount,
      isActive: true,
      status: "open",
      openedAt: new Date(),
      // city: cashier.city ? cashier.city._id : null, // ← Retiré
      // transactions: [], // ← Retiré
    });

    await newCashRegister.save();
    console.log("✅ Caisse ouverte avec succès :", newCashRegister);

// ⬇️ Ajouter ici la création du mouvement de caisse initial (ouverture)
await CashMovement.create({
  cashRegister: newCashRegister._id,
  type: "deposit",
  amount: openingAmount,
  performedBy: supervisorId, // c’est le superviseur qui "approvisionne"
  date: new Date(),
  note: "Ouverture de caisse"
});




    // 🔍 Journaliser l'ouverture de la caisse dans ActivityLog
    await ActivityLog.create({
      userId: req.user._id,
      action: "Ouverture de caisse",
      details: `Caisse ouverte : ${registerNumber} par le superviseur ${req.user.name} pour le caissier ${cashier.name} dans la ville ${cityName}`
    });

    // ✅ Réponse de succès
    res.status(201).json({ msg: "✅ Caisse créée avec succès !", cashRegister: newCashRegister });

  } catch (error) {
    console.error("❌ Erreur lors de l'ouverture de la caisse :", error);
    res.status(500).json({ msg: "Erreur du serveur. Veuillez réessayer plus tard." });
  }
};



  

// ✅ 2️⃣ Fermer une caisse




// export const closeCashRegister = async (req, res) => {
//   try {
//     const { closingAmount } = req.body;
//     const { id } = req.params;

//     // 1️⃣ Vérifier que la caisse existe et est bien ouverte
//     const cashRegister = await CashRegister.findById(id);
//     if (!cashRegister || cashRegister.status !== "open") {
//       return res.status(400).json({ msg: "Caisse introuvable ou déjà fermée." });
//     }

//     // 2️⃣ Vérifier qu'il n'y a pas de transfert interville en attente
//     // const pendingTransfers = await InterCityTransfer.findOne({
//     //   cashRegister: cashRegister._id,
//     //   status: "pending"
//     // });
    
//     // if (pendingTransfers) {
//     //   return res.status(400).json({
//     //     msg: "❌ Impossible de fermer la caisse : au moins un transfert interville est encore en attente de traitement."
//     //   });
//     // }



//     const pendingTransfers = await InterCityTransfer.find({
//   cashRegister: cashRegister._id,
//   status: "pending"
// }).populate("destinationCity", "name"); // si tu veux afficher le nom de la ville

// if (pendingTransfers.length > 0) {
//   return res.status(400).json({
//     msg: `❌ Impossible de fermer la caisse : ${pendingTransfers.length} transfert(s) interville en attente.`,
//     pendingTransfers: pendingTransfers.map((tr) => ({
//       _id: tr._id,
//       amount: tr.amount,
//       createdAt: tr.createdAt,
//       destination: tr.destinationCity?.name || "—",
//       beneficiary: tr.beneficiaryName || "—",
//       phone: tr.beneficiaryPhone || "—",
//     }))
//   });
// }

    

//     // 3️⃣ Récupérer les mouvements liés à la caisse
//     const movements = await CashMovement.find({ cashRegister: cashRegister._id });

//     const totalDeposits = movements
//       .filter((m) => m.type === "deposit" && m.note !== "Ouverture de caisse")
//       .reduce((sum, m) => sum + m.amount, 0);

//     const totalWithdrawals = movements
//       .filter((m) => m.type === "withdrawal")
//       .reduce((sum, m) => sum + m.amount, 0);

//     const expectedClosingAmount = (cashRegister.openingAmount ?? 0) + totalDeposits - totalWithdrawals;
//     const discrepancy = closingAmount - expectedClosingAmount;

//     // 4️⃣ Transferts interville du jour
//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0);
//     const todayEnd = new Date();
//     todayEnd.setHours(23, 59, 59, 999);

//     const interCityTransfers = await InterCityTransfer.find({
//       createdBy: cashRegister.cashier,
//       cashRegister: cashRegister._id,
//       createdAt: { $gte: todayStart, $lte: todayEnd },
//       status: "completed"
//     });

//     const totalInterCityAmount = interCityTransfers.reduce((sum, tr) => sum + (tr.amount || 0), 0);
//     const totalInterCityFees = interCityTransfers.reduce(
//       (sum, tr) => sum + (tr.commission || 0) + (tr.tax || 0),
//       0
//     );

//     // 5️⃣ Mise à jour de la caisse
//     cashRegister.status = "closed";
//     cashRegister.closingAmount = closingAmount;
//     cashRegister.discrepancy = discrepancy;
//     cashRegister.closedAt = new Date();
//     await cashRegister.save();

//     // 6️⃣ Rapport journalier
//     await DailyCashierReport.create({
//       cashier: cashRegister.cashier,
//       cashRegister: cashRegister._id,
//       date: new Date(),
//       openingAmount: cashRegister.openingAmount,
//       closingAmount,
//       totalDeposits,
//       totalWithdrawals,
//       totalInterCityTransfers: totalInterCityAmount,
//       totalInterCityFees,
//       discrepancy,
//       isClosed: true,
//     });

//     // 7️⃣ Rapport de fermeture
//     await ClosingReport.create({
//       cashRegister: cashRegister._id,
//       supervisor: cashRegister.supervisor,
//       cashier: cashRegister.cashier,
//       openingAmount: cashRegister.openingAmount,
//       totalDeposits,
//       totalWithdrawals,
//       expectedClosingAmount,
//       actualClosingAmount: closingAmount,
//       discrepancy,
//       closedAt: new Date(),
//       registerNumber: cashRegister.registerNumber,
//       totalInterCityFees,
//       performedBy: req.user?._id,
//     });

//     res.status(200).json({
//       msg: "✅ Caisse fermée avec succès.",
//       cashRegister,
//       expectedClosingAmount,
//       discrepancy,
//     });

//   } catch (error) {
//     console.error("❌ Erreur lors de la fermeture de la caisse :", error);
//     res.status(500).json({ msg: "Erreur du serveur." });
//   }
// };



export const closeCashRegister = async (req, res) => {
  try {
    const { closingAmount } = req.body;
    const { id } = req.params;

    console.log("🔍 Étape 1 : Vérification de la caisse ID :", id);
    const cashRegister = await CashRegister.findById(id);
    if (!cashRegister) {
      console.log("❌ Caisse introuvable.");
      return res.status(400).json({ msg: "Caisse introuvable." });
    }
    if (cashRegister.status !== "open") {
      console.log("❌ Caisse déjà fermée.");
      return res.status(400).json({ msg: "Caisse déjà fermée." });
    }

    console.log("✅ Caisse trouvée et ouverte.");

    // Étape 2 : Vérifier les transferts en attente
    // console.log("🔍 Vérification des transferts interville en attente...");
    // const pendingTransfers = await InterCityTransfer.find({
    //   cashRegister: cashRegister._id,
    //   status: "pending",
    // }).populate("destinationCity", "name");

    // if (pendingTransfers.length > 0) {
    //   console.log(`🚫 ${pendingTransfers.length} transfert(s) interville en attente. Clôture interdite.`);
    //   return res.status(400).json({
    //     msg: `❌ Impossible de fermer la caisse : ${pendingTransfers.length} transfert(s) interville en attente.`,
    //     pendingTransfers: pendingTransfers.map((tr) => ({
    //       _id: tr._id,
    //       amount: tr.amount,
    //       createdAt: tr.createdAt,
    //       destination: tr.destinationCity?.name || "—",
    //       beneficiary: tr.beneficiaryName || "—",
    //       phone: tr.beneficiaryPhone || "—",
    //     })),
    //   });
    // }


// // Étape 2 : Vérifier les transferts interville en attente dans les villes du superviseur
// console.log("🔍 Étape 2 : Vérification des transferts en attente selon la ville du superviseur...");

// // 🔹 Récupérer le superviseur avec sa ville
// const supervisor = await User.findById(cashRegister.supervisor).select("city name").populate("city", "name");

// if (!supervisor || !supervisor.city) {
//   console.log("❌ Superviseur introuvable ou non rattaché à une ville.");
//   return res.status(400).json({ msg: "Superviseur sans ville rattachée. Impossible de vérifier les transferts." });
// }

// const cityId = supervisor.city._id.toString();
// console.log(`🏙️ Ville du superviseur : ${supervisor.city.name} (${cityId})`);

// // 🔍 Rechercher les transferts en attente liés à cette ville (comme origine OU destination)
// const pendingTransfers = await InterCityTransfer.find({
//   status: "pending",
//   $or: [
//     { senderCity: cityId },
//     { receiverCity: cityId },
//   ]
// }).populate("receiverCity senderCity", "name");

// console.log(`🔢 ${pendingTransfers.length} transfert(s) en attente liés à la ville du superviseur.`);

// if (pendingTransfers.length > 0) {
//   console.log("⛔ Clôture interdite : des transferts en attente concernent cette ville.");

//  return res.status(400).json({
//   msg: `❌ Impossible de fermer la caisse : ${pendingTransfers.length} transfert(s) interville en attente dans votre ville (émission ou réception).`,
//   pendingTransfers: pendingTransfers.map((tr) => ({
//     _id: tr._id,
//     amount: tr.amount,
//     createdAt: tr.createdAt,
//     senderFirstName: tr.senderFirstName,
//     senderLastName: tr.senderLastName,
//     senderPhone: tr.senderPhone,
//     senderCity: tr.senderCity?.name || "—",
//     receiverName: tr.receiverName,
//     receiverPhone: tr.receiverPhone,
//     receiverCity: tr.receiverCity?.name || "—",
//     cashRegister: tr.cashRegister,
//     status: tr.status,
//     secretCode: tr.secretCode,
//     isMobileTransfer: tr.isMobileTransfer,
//     refunded: tr.refunded,
//   })),
// });

// }

// console.log("✅ Aucun transfert bloquant trouvé. Clôture autorisée.");






// Étape 2 : Vérifier les transferts interville en attente liés à la ville du superviseur
console.log("🔍 Étape 2 : Vérification des transferts interville liés à la ville du superviseur");

const supervisor = await User.findById(cashRegister.supervisor).select("city name").populate("city", "name");

if (!supervisor || !supervisor.city) {
  console.log("❌ Superviseur introuvable ou non rattaché à une ville.");
  return res.status(400).json({ msg: "Superviseur sans ville rattachée. Impossible de vérifier les transferts." });
}

const cityId = supervisor.city._id.toString();
console.log(`🏙️ Ville du superviseur : ${supervisor.city.name} (${cityId})`);

// Rechercher tous les transferts pending (même ceux sans senderCity)
const pendingTransfers = await InterCityTransfer.find({
  status: "pending",
  $or: [
    { senderCity: cityId },
    { receiverCity: cityId }
  ]
}).populate("senderCity receiverCity", "name");

console.log(`🔢 ${pendingTransfers.length} transfert(s) en attente trouvés dans la ville du superviseur.`);

if (pendingTransfers.length > 0) {
  console.log("⛔ Clôture refusée. Transferts en attente dans cette ville.");

  return res.status(400).json({
    msg: `❌ Impossible de fermer la caisse : ${pendingTransfers.length} transfert(s) interville en attente dans votre ville.`,
    pendingTransfers: pendingTransfers.map((tr) => ({
      _id: tr._id,
      amount: tr.amount,
      createdAt: tr.createdAt,
      senderFirstName: tr.senderFirstName,
      senderLastName: tr.senderLastName,
      senderPhone: tr.senderPhone,
      senderCity: tr.senderCity?.name || "—",
      receiverName: tr.receiverName,
      receiverPhone: tr.receiverPhone,
      receiverCity: tr.receiverCity?.name || "—",
      isMobileTransfer: tr.isMobileTransfer,
      refunded: tr.refunded,
      status: tr.status
    })),
  });
}

console.log("✅ Aucun transfert bloquant détecté. Poursuite de la fermeture.");

    // Étape 3 : Récupération des mouvements
    console.log("🔍 Récupération des mouvements liés à la caisse...");
    const movements = await CashMovement.find({ cashRegister: cashRegister._id });

    const totalDeposits = movements
      .filter((m) => m.type === "deposit" && m.note !== "Ouverture de caisse")
      .reduce((sum, m) => sum + m.amount, 0);
    const totalWithdrawals = movements
      .filter((m) => m.type === "withdrawal")
      .reduce((sum, m) => sum + m.amount, 0);

    const expectedClosingAmount = (cashRegister.openingAmount ?? 0) + totalDeposits - totalWithdrawals;
    const discrepancy = closingAmount - expectedClosingAmount;

    console.log("💰 Total dépôts :", totalDeposits);
    console.log("💸 Total retraits :", totalWithdrawals);
    console.log("📊 Montant attendu :", expectedClosingAmount);
    console.log("⚠️ Écart de caisse :", discrepancy);

    // Étape 4 : Calcul des transferts du jour
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const interCityTransfers = await InterCityTransfer.find({
      createdBy: cashRegister.cashier,
      cashRegister: cashRegister._id,
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: "completed",
    });

    const totalInterCityAmount = interCityTransfers.reduce((sum, tr) => sum + (tr.amount || 0), 0);
    const totalInterCityFees = interCityTransfers.reduce(
      (sum, tr) => sum + (tr.commission || 0) + (tr.tax || 0),
      0
    );

    console.log("🚚 Total transferts interville du jour :", totalInterCityAmount);
    console.log("🧾 Total frais des transferts :", totalInterCityFees);

    // Étape 5 : Clôture de la caisse
    console.log("🔒 Clôture de la caisse en cours...");
    cashRegister.status = "closed";
    cashRegister.closingAmount = closingAmount;
    cashRegister.discrepancy = discrepancy;
    cashRegister.closedAt = new Date();
    await cashRegister.save();
    console.log("✅ Caisse fermée et sauvegardée.");

    // Étape 6 : Rapport journalier
    await DailyCashierReport.create({
      cashier: cashRegister.cashier,
      cashRegister: cashRegister._id,
      date: new Date(),
      openingAmount: cashRegister.openingAmount,
      closingAmount,
      totalDeposits,
      totalWithdrawals,
      totalInterCityTransfers: totalInterCityAmount,
      totalInterCityFees,
      discrepancy,
      isClosed: true,
    });
    console.log("📄 Rapport journalier enregistré.");

    // Étape 7 : Rapport de fermeture
    await ClosingReport.create({
      cashRegister: cashRegister._id,
      supervisor: cashRegister.supervisor,
      cashier: cashRegister.cashier,
      openingAmount: cashRegister.openingAmount,
      totalDeposits,
      totalWithdrawals,
      expectedClosingAmount,
      actualClosingAmount: closingAmount,
      discrepancy,
      closedAt: new Date(),
      registerNumber: cashRegister.registerNumber,
      totalInterCityFees,
      performedBy: req.user?._id,
    });
    console.log("📘 Rapport de fermeture enregistré.");

    res.status(200).json({
      msg: "✅ Caisse fermée avec succès.",
      cashRegister,
      expectedClosingAmount,
      discrepancy,
    });

  } catch (error) {
    console.error("❌ Erreur lors de la fermeture de la caisse :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};





// ✅ 3️⃣ Réouvrir une caisse avec justification
export const reopenCashRegister = async (req, res) => {
  try {
    const { justification } = req.body;
    const { id } = req.params;

    // 🔎 Vérifier si la caisse existe et est bien fermée
    const cashRegister = await CashRegister.findById(id);
    if (!cashRegister || cashRegister.status !== "closed") {
      return res.status(400).json({ msg: "Caisse introuvable ou déjà ouverte." });
    }

    if (!justification) {
      return res.status(400).json({ msg: "Une justification est requise pour réouvrir la caisse." });
    }

    // ✅ Réouverture de la caisse
    cashRegister.status = "open";
    cashRegister.justification = justification;
    cashRegister.closedAt = null; // 🔹 Remettre à zéro la fermeture

    await cashRegister.save();
    console.log("✅ Caisse réouverte :", cashRegister);

    res.status(200).json({ msg: "Caisse réouverte avec succès.", cashRegister });
  } catch (error) {
    console.error("❌ Erreur lors de la réouverture de la caisse :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};

// ✅ 4️⃣ Récupérer toutes les caisses du superviseur
export const getCashRegisters = async (req, res) => {
  try {
    console.log("📌 Récupération des caisses du superviseur :", req.user._id);
    
    const cashRegisters = await CashRegister.find({ supervisor: req.user._id })
      .populate("cashier", "name phone")
      .sort({ openedAt: -1 });

    console.log(`✅ ${cashRegisters.length} caisses trouvées.`);
    res.status(200).json(cashRegisters);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des caisses :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};




export const addFundsToCashRegister = async (req, res) => {
  try {
      const { amount } = req.body;
      const { id } = req.params;
      
      console.log("📌 Ajout de fonds à la caisse :", id, "| Montant :", amount);

      if (!amount || amount <= 0) {
          console.log("❌ Erreur : Montant invalide.");
          return res.status(400).json({ msg: "Le montant doit être supérieur à zéro." });
      }

      // 🔎 Vérifier si la caisse existe et est ouverte
      const cashRegister = await CashRegister.findById(id);
      if (!cashRegister || cashRegister.status !== "open") {
          console.log("❌ Erreur : Caisse introuvable ou déjà fermée.");
          return res.status(400).json({ msg: "Caisse introuvable ou déjà fermée." });
      }

      // ✅ Mise à jour du solde actuel
      cashRegister.currentBalance += amount;

      await cashRegister.save();

      // ✅ Enregistrer la transaction dans CashMovement
      await CashMovement.create({
          cashRegister: cashRegister._id,
          type: "deposit",
          amount,
          performedBy: req.user._id,
          date: new Date(),
          note: "Ajout de fonds à la caisse",
      });

      console.log("✅ Fonds ajoutés avec succès :", cashRegister.currentBalance);

      res.status(200).json({
          msg: "Fonds ajoutés avec succès.",
          currentBalance: cashRegister.currentBalance,
      });
         
  } catch (error) {
      console.error("❌ Erreur lors de l'ajout des fonds :", error);
      res.status(500).json({ msg: "Erreur du serveur." });
  }
};




export const withdrawFunds = async (req, res) => {
  try {
    const { id } = req.params;
    const { withdrawalAmount } = req.body;

    console.log("📌 Retrait de fonds demandé pour la caisse :", id, "| Montant :", withdrawalAmount);

    if (!withdrawalAmount || withdrawalAmount <= 0) {
      console.log("⚠️ Erreur : Montant invalide.");
      return res.status(400).json({ msg: "Montant invalide." });
    }

    // Vérifier si la caisse existe et est ouverte
    const cashRegister = await CashRegister.findById(id);
    if (!cashRegister) {
      console.log("❌ Erreur : Caisse introuvable.");
      return res.status(404).json({ msg: "Caisse introuvable." });
    }
    if (cashRegister.status !== "open") {
      console.log("❌ Erreur : Impossible de retirer des fonds d'une caisse fermée.");
      return res.status(400).json({ msg: "Impossible de retirer des fonds d'une caisse fermée." });
    }

    // Vérifier si le solde est suffisant pour retirer
    if (cashRegister.currentBalance < withdrawalAmount) {
      console.log("❌ Erreur : Solde insuffisant.");
      return res.status(400).json({ msg: "Solde insuffisant pour ce retrait." });
    }

    // Déduire le montant
    cashRegister.currentBalance -= withdrawalAmount;

    await cashRegister.save();

    // Ajouter une entrée dans CashMovement
    await CashMovement.create({
      cashRegister: cashRegister._id,
      type: "withdrawal",
      amount: withdrawalAmount,
      performedBy: req.user._id,
      date: new Date(),
      note: "Retrait de fonds de la caisse",
    });

    console.log("✅ Retrait effectué avec succès :", cashRegister);

    res.status(200).json({
      msg: "Retrait effectué avec succès.",
      currentBalance: cashRegister.currentBalance,
    });
  } catch (error) {
    console.error("❌ Erreur lors du retrait de fonds :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};





export const getCashRegisterTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    console.log(`📌 Récupération des transactions pour la caisse : ${id} | Page : ${page}`);

    // Vérifie d'abord que la caisse existe
    const cashRegister = await CashRegister.findById(id).populate("cashier", "name phone");
    if (!cashRegister) {
      return res.status(404).json({ msg: "Caisse introuvable." });
    }

    // ❌ On exclut "Ouverture de caisse" de la liste des transactions
    const query = {
      cashRegister: id,
      note: { $ne: "Ouverture de caisse" }, // 👈 Ici on filtre !
    };

    const totalTransactions = await CashMovement.countDocuments(query);
    const transactions = await CashMovement.find(query)
      .populate("performedBy", "name")
      .sort({ date: -1 }) // Du plus récent au plus ancien
      .skip((page - 1) * limit)
      .limit(Number(limit));

    console.log(`✅ Transactions retournées : ${transactions.length}/${totalTransactions}`);

    res.status(200).json({
      cashRegister,
      transactions,
      totalTransactions,
      totalPages: Math.ceil(totalTransactions / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des transactions :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};


// /controllers/cashRegisterController.js













export const getCashRegisterReporting = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const supervisorId = req.user.id;

    // 🔍 Filtrer les caisses du superviseur connecté
    const query = { supervisor: supervisorId };

    if (startDate || endDate) {
      query.openedAt = {};
      if (startDate) query.openedAt.$gte = new Date(startDate);
      if (endDate) query.openedAt.$lte = new Date(endDate);
    }

    const cashRegisters = await CashRegister.find(query)
      .populate("cashier", "name phone")
      .lean();

    // 🔁 Pour chaque caisse, calculer les mouvements associés
    const reportData = await Promise.all(
      cashRegisters.map(async (reg) => {
        const movements = await CashMovement.find({ cashRegister: reg._id });

        const totalDeposits = movements
          .filter((m) => m.type === "deposit" && m.note !== "Ouverture de caisse")
          .reduce((sum, m) => sum + m.amount, 0);

        const totalWithdrawals = movements
          .filter((m) => m.type === "withdrawal")
          .reduce((sum, m) => sum + m.amount, 0);

        const theoreticalBalance =
          (reg.openingAmount || 0) + totalDeposits - totalWithdrawals;

        return {
          registerNumber: reg.registerNumber,
          cashier: reg.cashier,
          city: reg.city,
          openingAmount: reg.openingAmount || 0,
          totalDeposits,
          totalWithdrawals,
          closingAmount: reg.closingAmount || 0,
          theoreticalBalance,
          discrepancy: reg.discrepancy || 0,
          status: reg.status,
        };
      })
    );

    res.json(reportData);
  } catch (error) {
    console.error("❌ Erreur reporting caisse :", error);
    res.status(500).json({ msg: "Erreur serveur lors du reporting" });
  }
};