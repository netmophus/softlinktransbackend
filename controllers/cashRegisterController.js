import CashRegister from "../models/CashRegister.js";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";


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

    // ✅ Vérification qu'il n'y a pas déjà une caisse ouverte pour ce caissier
    // const existingCashRegister = await CashRegister.findOne({ 
    //   cashier: cashierId, status: "open" 
    // });


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

    // ✅ Création de la nouvelle caisse
    const newCashRegister = new CashRegister({
      registerNumber,
      cashier: cashierId,
      supervisor: supervisorId,
      initialBalance, 
      openingAmount,
      currentBalance: openingAmount,
      isActive: true, // 🔥 Marquer la caisse comme active lors de la création
      status: "open",
      transactions: [],
      openedAt: new Date(),
      city: cashier.city ? cashier.city._id : null, // 🔥 Association de la ville
    });
    
    await newCashRegister.save();
    console.log("✅ Caisse ouverte avec succès :", newCashRegister);

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
export const closeCashRegister = async (req, res) => {
  try {
    const { closingAmount } = req.body;
    const { id } = req.params;
    
    // 🔎 Vérifier si la caisse existe et est bien ouverte
    const cashRegister = await CashRegister.findById(id);
    if (!cashRegister || cashRegister.status !== "open") {
      return res.status(400).json({ msg: "Caisse introuvable ou déjà fermée." });
    }

    // ✅ Calcul de l'écart
    const discrepancy = closingAmount - cashRegister.openingAmount;

    // 🔹 Fermeture de la caisse
    cashRegister.status = "closed";
    cashRegister.closingAmount = closingAmount;
    cashRegister.discrepancy = discrepancy;
    cashRegister.closedAt = new Date();

    await cashRegister.save();
    console.log("✅ Caisse fermée :", cashRegister);

    res.status(200).json({ msg: "Caisse fermée avec succès.", cashRegister });
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
        
        // ✅ Enregistrer la transaction d'ajout de fonds
        cashRegister.transactions.push({
            type: "deposit",
            amount,
            performedBy: req.user._id,
            date: new Date(),
        });

        await cashRegister.save();
        console.log("✅ Fonds ajoutés avec succès :", cashRegister.currentBalance);

        res.status(200).json({
            msg: "Fonds ajoutés avec succès.",
            currentBalance: cashRegister.currentBalance, // ✅ Vérifie que cela est bien inclus
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
  
      // Ajouter une transaction de retrait
      cashRegister.transactions.push({
        type: "withdrawal",
        amount: withdrawalAmount,
        performedBy: req.user._id,
        date: new Date(),
      });
  
      await cashRegister.save();
      console.log("✅ Retrait effectué avec succès :", cashRegister);
  
      res.status(200).json({
        msg: "Retrait effectué avec succès.",
        currentBalance: cashRegister.currentBalance, // 🔹 Met à jour l'affichage dans le frontend
      });
    } catch (error) {
      console.error("❌ Erreur lors du retrait de fonds :", error);
      res.status(500).json({ msg: "Erreur du serveur." });
    }
  };



//   export const getCashRegisterTransactions = async (req, res) => {
//     try {
//       const { id } = req.params;
//       console.log("📌 Requête reçue pour l'historique de la caisse :", id);
  
//       const cashRegister = await CashRegister.findById(id)
//         .populate("cashier", "name phone")
//         .populate("transactions.performedBy", "name");
  
//       if (!cashRegister) {
//         console.log("❌ Caisse introuvable !");
//         return res.status(404).json({ msg: "Caisse introuvable." });
//       }
  
//       console.log("✅ Transactions récupérées :", cashRegister.transactions);
  
//       res.status(200).json({
//         cashRegister,
//         transactions: cashRegister.transactions
//       });
  
//     } catch (error) {
//       console.error("❌ Erreur lors de la récupération des transactions :", error);
//       res.status(500).json({ msg: "Erreur du serveur." });
//     }
//   };
  
  

export const getCashRegisterTransactions = async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query; // 🔹 Récupérer page et limite (par défaut : page 1, 10 transactions)
  
      console.log(`📌 Récupération des transactions pour la caisse : ${id} | Page : ${page}`);
  
      const cashRegister = await CashRegister.findById(id)
        .populate("cashier", "name phone")
        .populate({
          path: "transactions.performedBy",
          select: "name",
        });
  
      if (!cashRegister) {
        return res.status(404).json({ msg: "Caisse introuvable." });
      }
  
      // 🔹 Trier les transactions du plus récent au plus ancien et limiter à 100 max
      const totalTransactions = cashRegister.transactions.length;
      const paginatedTransactions = cashRegister.transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // Trier par date décroissante
        .slice((page - 1) * limit, page * limit); // Pagination
  
      console.log(`✅ Transactions retournées : ${paginatedTransactions.length}/${totalTransactions}`);
  
      res.status(200).json({
        cashRegister,
        transactions: paginatedTransactions,
        totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit),
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des transactions :", error);
      res.status(500).json({ msg: "Erreur du serveur." });
    }
  };
  