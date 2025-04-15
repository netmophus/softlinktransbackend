

import Tontine from "../models/Tontine.js";
import User from "../models/User.js";
import { sendSMS } from "../services/smsService.js";
import TontineCycle from "../models/TontineCycle.js";
import TontinePayment from "../models/TontinePayment.js";
import bcrypt from "bcryptjs";


// ✅ Créer une tontine
export const createTontine = async (req, res) => {
  try {
      // const { name, contributionAmount, totalCycles, startDate, frequency } = req.body;

      let { name, contributionAmount, totalCycles, startDate, frequency } = req.body;

// 🔐 Générer un suffixe unique
const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
name = `${name.trim()}-${uniqueSuffix}`;

//✅ Reformater la date correctement
const [day, month, year] = startDate.split("-");
startDate = new Date(`${year}-${month}-${day}`);


      const initiator = req.user._id;



         // ✅ Limite globale : ne pas dépasser 200 tontines actives
    const MAX_TONTINES = 200;
    const activeTontinesCount = await Tontine.countDocuments({ status: "active" });
    if (activeTontinesCount >= MAX_TONTINES) {
      return res.status(400).json({ msg: "🚫 Limite atteinte : nombre maximum de tontines actives (200)." });
    }

    // // ✅ Vérifier si une tontine avec ce nom existe déjà pour ce créateur
    // const existingTontine = await Tontine.findOne({ name, initiator });
    // if (existingTontine) {
    //   return res.status(400).json({ msg: "Vous avez déjà une tontine avec ce nom." });
    // }


      // Vérifier si une tontine avec ce nom existe déjà
      const existingTontine = await Tontine.findOne({ name, initiator });
      if (existingTontine) {
          return res.status(400).json({ msg: "Vous avez déjà une tontine avec ce nom." });
      }

      // Créer la tontine avec un compte virtuel
      const tontine = new Tontine({
          name,
          initiator,
          contributionAmount,
          totalCycles,
          startDate,
          frequency,
          currentCycle: 1,
          status: "active",
          virtualAccount: { balance: 0, currency: "XOF" },
          members: [{ user: initiator, joinedAt: new Date() }] // 🔹 Ajout de l'initiateur automatiquement
      });

      await tontine.save();

      // 📅 Initialiser les cycles
      const cycles = [];
      const initialDate = new Date(startDate);

      for (let i = 0; i < totalCycles; i++) {
          const dueDate = new Date(initialDate);
          if (frequency === "weekly") {
              dueDate.setDate(initialDate.getDate() + i * 7);
          } else if (frequency === "monthly") {
              dueDate.setMonth(initialDate.getMonth() + i);
          }

          const cycle = new TontineCycle({
              tontine: tontine._id,
              cycleNumber: i + 1,
              dueDate,
              isCompleted: false
          });

          await cycle.save();
          cycles.push(cycle);
      }


      // ✅ Initialiser les paiements pour l'initiateur avec `paymentMethod`
const payments = cycles.map((cycle) => ({
  tontine: tontine._id,
  user: initiator,
  cycle: cycle._id,
  amountPaid: 0,
  hasPaid: false,
  paymentDate: null,
  paymentMethod: "compte_virtuel", // 🔥 Correction : Ajouter un mode de paiement par défaut
}));

await TontinePayment.insertMany(payments);


      console.log("✅ Tontine et cycles créés avec succès :", tontine);
      return res.status(201).json({ msg: "✅ Tontine et cycles créés avec succès.", tontine, cycles });
  } catch (error) {
      console.error("❌ Erreur lors de la création de la tontine :", error);
      res.status(500).json({ msg: "Erreur serveur." });
  }
};





export const enrollMember = async (req, res) => {
  try {
    const { tontineId } = req.params;
    const { phone } = req.body;
    const initiatorId = req.user._id; // ✅ Utilisateur connecté

    console.log("📡 Tentative d'enrôlement avec le téléphone :", phone);

    // 🔍 Vérifier si l'utilisateur existe et récupérer son rôle
    const user = await User.findOne({ phone }).select("_id name phone role");

    if (!user) {
      console.error("❌ Utilisateur introuvable :", phone);
      return res.status(404).json({ msg: "Utilisateur non trouvé." });
    }

    if (user.role !== "user") {
      console.error("❌ Enrôlement refusé : L'utilisateur n'a pas le rôle 'user'.");
      return res.status(403).json({ msg: "Seuls les utilisateurs avec le rôle 'user' peuvent être enrôlés." });
    }

    console.log("✅ Utilisateur trouvé et valide :", user);

    // ✅ Vérifier si la tontine existe
    const tontine = await Tontine.findById(tontineId);
    if (!tontine) {
      console.error("❌ Tontine non trouvée :", tontineId);
      return res.status(404).json({ msg: "Tontine non trouvée." });
    }

    // ✅ Vérifier que le demandeur est bien l’initiateur
    if (String(tontine.initiator) !== String(initiatorId)) {
      console.error("❌ Accès interdit : seul l’initiateur peut enrôler des membres.");
      return res.status(403).json({ msg: "Accès interdit. Seul l’initiateur de la tontine peut ajouter des membres." });
    }

    console.log("✅ Tontine trouvée :", tontine.name);

    // ✅ Vérifier si l'utilisateur est déjà enrôlé
    const isAlreadyMember = tontine.members.some((m) => String(m.user) === String(user._id));
    if (isAlreadyMember) {
      return res.status(400).json({ msg: "⚠️ Membre déjà enrôlé dans cette tontine." });
    }

    // 📅 Initialiser les paiements pour chaque cycle
    const payments = [];
    const cycles = await TontineCycle.find({ tontine: tontineId });

    // for (const cycle of cycles) {
    //   const newPayment = new TontinePayment({
    //     tontine: tontineId,
    //     user: user._id,
    //     cycle: cycle._id,
    //     amountPaid: 0,
    //     hasPaid: false,
    //     paymentDate: null,
    //     paymentMethod: "compte_virtuel",
    //   });

    //   await newPayment.save();
    //   payments.push(newPayment);

    //   await TontineCycle.findByIdAndUpdate(
    //     cycle._id,
    //     { $push: { payments: newPayment._id } },
    //     { new: true }
    //   );
    // }

    // ✅ Ajouter le membre
    
    
    for (const cycle of cycles) {
      // ⚠️ Vérifie s’il existe déjà un paiement pour ce user et ce cycle
      const existingPayment = await TontinePayment.findOne({
        tontine: tontineId,
        user: user._id,
        cycle: cycle._id,
      });
    
      if (!existingPayment) {
        const newPayment = new TontinePayment({
          tontine: tontineId,
          user: user._id,
          cycle: cycle._id,
          amountPaid: 0,
          hasPaid: false,
          paymentDate: null,
          paymentMethod: "compte_virtuel",
        });
    
        await newPayment.save();
        payments.push(newPayment);
    
        // 🧠 Utilise $addToSet pour éviter les doublons dans le tableau `payments`
        await TontineCycle.findByIdAndUpdate(
          cycle._id,
          { $addToSet: { payments: newPayment._id } },
          { new: true }
        );
      }
    }
    
    
    
    
    
    
    
    tontine.members.push({ user: user._id });
    await tontine.save();



    // ✅ Envoyer un SMS de notification au nouveau membre
const message = `📢 Bonjour ${user.name} ! Vous avez été ajouté à la tontine "${tontine.name}".
Connectez-vous à l'application pour consulter les conditions et vérifier vos échéances.`;

await sendSMS(user.phone, message);
console.log(`📨 SMS envoyé à ${user.phone}`);


    console.log(`✅ Membre ajouté avec succès : ${user.name} (${user.phone})`);
    res.status(200).json({ msg: "✅ Membre ajouté avec succès." });

  } catch (error) {
    console.error("❌ Erreur lors de l'enrôlement du membre :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};


export const getMyTontines = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`✅ Utilisateur authentifié : ${userId}`);

    // ✅ Récupérer les tontines où l'utilisateur est initiateur
    const tontinesAsInitiator = await Tontine.find({ initiator: userId })
      .populate("initiator", "name phone")
      .lean();

    // ✅ Récupérer les tontines où l'utilisateur est membre
    const tontineIdsAsMember = await TontinePayment.distinct("tontine", { user: userId });
    const tontinesAsMember = await Tontine.find({ _id: { $in: tontineIdsAsMember } })
      .populate("initiator", "name phone")
      .lean();

    // ✅ Fusionner les tontines sans doublons
    const allTontines = [...tontinesAsInitiator, ...tontinesAsMember];
    const tontinesUnique = allTontines.reduce((acc, tontine) => {
      if (!acc.some((t) => String(t._id) === String(tontine._id))) {
        acc.push(tontine);
      }
      return acc;
    }, []);

    // 🔹 Associer les cycles et paiements
    for (const tontine of tontinesUnique) {
      // 📅 Charger les cycles
      // tontine.cycles = await TontineCycle.find({ tontine: tontine._id })
      //   .sort("cycleNumber")
      //   .lean();

          tontine.cycles = await TontineCycle.find({ tontine: tontine._id })
      .sort("cycleNumber")
      .populate("beneficiary", "name phone")
      .lean();


      // 💰 Charger les paiements de l'utilisateur connecté
      tontine.payments = await TontinePayment.find({ tontine: tontine._id, user: userId })
        .populate("cycle", "cycleNumber dueDate")
        .lean();
    }


    // 👥 Récupérer les membres de la tontine
       for (const tontine of tontinesUnique) {
      const rawMembers = await TontinePayment.find({ tontine: tontine._id })
        .populate("user", "name phone")
        .lean();
    
      // 💡 Supprimer les doublons par ID utilisateur
      const seen = new Set();
      tontine.members = rawMembers
        .filter((m) => {
          const uid = String(m.user._id);
          if (seen.has(uid)) return false;
          seen.add(uid);
          return true;
        })
        .map((m) => ({
          user: m.user._id,
          name: m.user.name,
          phone: m.user.phone,
        }));
    }
    
    

    console.log("✅ Tontines récupérées avec succès !");
    res.status(200).json(tontinesUnique);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des tontines :", error);
    res.status(500).json({ msg: "Erreur serveur lors de la récupération des tontines." });
  }
};





  export const findUserByPhone = async (req, res) => {
    try {
      const { phone } = req.params;
      console.log("📡 Recherche de l'utilisateur avec téléphone :", phone);
  
      const user = await User.findOne({ phone });
  
      if (!user) {
        console.warn("⚠️ Aucun utilisateur trouvé pour :", phone);
        return res.status(404).json({ msg: "Utilisateur non trouvé." });
      }
  
      console.log("✅ Utilisateur trouvé :", user);
      res.status(200).json(user);
    } catch (error) {
      console.error("❌ Erreur lors de la recherche de l'utilisateur :", error);
      res.status(500).json({ msg: "Erreur serveur." });
    }
  };
  
  
  
// ✅ Fonction pour envoyer une notification après l'ajout d'un membre
export const sendTontineNotification = async (req, res) => {
    try {
      const { tontineId } = req.params;
      const { phone } = req.body;
  
      if (!phone) {
        return res.status(400).json({ msg: "Numéro de téléphone requis." });
      }
  
      // 🔍 Vérifier si l'utilisateur existe
      const user = await User.findOne({ phone }).select("name phone");
      if (!user) {
        return res.status(404).json({ msg: "Utilisateur non trouvé." });
      }
  
      // 🔍 Vérifier si la tontine existe
      const tontine = await Tontine.findById(tontineId);
      if (!tontine) {
        return res.status(404).json({ msg: "Tontine non trouvée." });
      }
  
      const message = `📢 Salut ${user.name} ! Tu as été ajouté à la tontine "${tontine.name}". 
      Contribution : ${tontine.contributionAmount} XOF | Cycles : ${tontine.totalCycles}.
      Prépare-toi à cotiser !`;
  
      // ✅ Envoi du SMS
      await sendSMS(user.phone, message);
  
      console.log(`✅ Notification envoyée à ${user.phone} pour la tontine "${tontine.name}"`);
      res.status(200).json({ msg: "✅ Notification envoyée avec succès." });
  
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de la notification :", error);
      res.status(500).json({ msg: "Erreur lors de l'envoi de la notification." });
    }
  };







export const getTontineCycles = async (req, res) => {
  try {
    const { tontineId } = req.params;

    // Vérifier si la tontine existe
    const cycles = await TontineCycle.find({ tontine: tontineId }).sort("cycleNumber");

    if (!cycles.length) {
      return res.status(404).json({ msg: "Aucun cycle trouvé pour cette tontine." });
    }

    console.log(`✅ Cycles récupérés pour la tontine ${tontineId}`);
    res.status(200).json(cycles);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des cycles :", error);
    res.status(500).json({ msg: "Erreur serveur lors de la récupération des cycles." });
  }
};



export const getUserTontines = async (req, res) => {
  try {
      const userId = req.user._id;

      console.log("📡 Récupération des tontines pour l'utilisateur :", userId);

      // ✅ Si l'utilisateur est l'initiateur, il voit toutes ses tontines
      const tontinesAsInitiator = await Tontine.find({ initiator: userId })
          .populate("initiator", "name phone")
          .lean();

      // ✅ Si l'utilisateur est un membre, il voit seulement les tontines où il est enrôlé
      const tontineIds = await TontinePayment.distinct("tontine", { user: userId });

      const tontinesAsMember = await Tontine.find({ _id: { $in: tontineIds } })
          .populate("initiator", "name phone")
          .lean();

      // ✅ Fusionner les tontines sans doublons
      const allTontines = [...tontinesAsInitiator, ...tontinesAsMember];

      console.log("✅ Tontines récupérées :", allTontines.length);

      res.status(200).json(allTontines);
  } catch (error) {
      console.error("❌ Erreur lors de la récupération des tontines :", error);
      res.status(500).json({ msg: "Erreur serveur lors de la récupération des tontines." });
  }
};



export const getUserTontineDetails = async (req, res) => {
  try {
      const { tontineId } = req.params;
      const userId = req.user._id;

      console.log("📡 Récupération des cycles et paiements pour :", userId);

      // ✅ Vérifier si l'utilisateur est membre de cette tontine
      const isMember = await TontinePayment.exists({ tontine: tontineId, user: userId });

      if (!isMember) {
          return res.status(403).json({ msg: "Vous n'êtes pas membre de cette tontine." });
      }

      // ✅ Récupérer les cycles de cette tontine
      

      const cycles = await TontineCycle.find({ tontine: tontineId })
      .populate("beneficiary", "name phone")
      .lean();


      // ✅ Récupérer les paiements de l'utilisateur
      const payments = await TontinePayment.find({ tontine: tontineId, user: userId })
          .populate("cycle", "cycleNumber dueDate")
          .lean();

      res.status(200).json({ cycles, payments });
  } catch (error) {
      console.error("❌ Erreur lors de la récupération des détails de la tontine :", error);
      res.status(500).json({ msg: "Erreur serveur." });
  }
};





export const payTontineContribution = async (req, res) => {
  try {
    const { tontineId } = req.params;
    const { userId, cycleId, paymentMethod } = req.body;

    // 🔎 Vérifier la tontine
    const tontine = await Tontine.findById(tontineId);
    if (!tontine) return res.status(404).json({ msg: "Tontine non trouvée." });

    // 🔎 Vérifier le cycle
    const cycle = await TontineCycle.findById(cycleId);
    if (!cycle) return res.status(400).json({ msg: "Cycle introuvable." });
    if (cycle.isCompleted) return res.status(400).json({ msg: "Ce cycle est déjà clôturé." });

    // 🔎 Paiement autorisé uniquement dans le mois du cycle
    const now = new Date();
    const dueDate = new Date(cycle.dueDate);
    const sameMonth =
      now.getFullYear() === dueDate.getFullYear() &&
      now.getMonth() === dueDate.getMonth();

    if (!sameMonth) {
      return res.status(400).json({ msg: "❌ Le paiement n’est autorisé que pendant le mois du cycle." });
    }

    // 🔎 Vérifier le cycle précédent
    if (cycle.cycleNumber > 1) {
      const previousCycle = await TontineCycle.findOne({
        tontine: tontineId,
        cycleNumber: cycle.cycleNumber - 1,
      });
      if (previousCycle && !previousCycle.isCompleted) {
        return res.status(400).json({
          msg: `❌ Le cycle ${previousCycle.cycleNumber} doit être complété avant de payer ce cycle.`,
        });
      }
    }

    // 🔎 Vérifier l'utilisateur
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "Utilisateur non trouvé." });

    // 🔎 Vérifier le paiement existant
    const existingPayment = await TontinePayment.findOne({
      tontine: tontineId,
      cycle: cycle._id,
      user: userId,
    });
    if (!existingPayment) return res.status(400).json({ msg: "Aucun paiement enregistré pour cet utilisateur." });
    if (existingPayment.hasPaid) return res.status(400).json({ msg: "Ce membre a déjà payé ce cycle." });

    // ✅ Calcul du montant et des frais
    const contributionAmount = tontine.contributionAmount;
    // const managementFee = (2 / 100) * contributionAmount;
    // const taxAmount = (19 / 100) * managementFee;
    // const totalDeduction = managementFee + taxAmount;
    // const netAmount = contributionAmount - totalDeduction;


    const managementFee = 0;
    const taxAmount = 0;
    const totalDeduction = 0;
    const netAmount = contributionAmount;


    // ✅ Paiement depuis le compte virtuel
    if (paymentMethod === "compte_virtuel") {
      if (user.virtualAccount.balance < contributionAmount) {
        return res.status(400).json({ msg: "Fonds insuffisants dans le compte virtuel." });
      }
      user.virtualAccount.balance -= contributionAmount;
      await user.save();
    }

    // ✅ Créditer le compte de la tontine
    tontine.virtualAccount.balance += netAmount;
    await tontine.save();

    // ✅ Mettre à jour le paiement
    existingPayment.amountPaid = contributionAmount;
    existingPayment.hasPaid = true;
    existingPayment.paymentDate = new Date();
    existingPayment.paymentMethod = paymentMethod;
    existingPayment.managementFee = managementFee;
    existingPayment.taxAmount = taxAmount;
    await existingPayment.save();


    await TontineCycle.findByIdAndUpdate(
      cycle._id,
      { $addToSet: { payments: existingPayment._id } },
      { new: true }
    );

    // ✅ Mettre à jour le statut du cycle
    // if (cycle.status === "pending") {
    //   cycle.status = "in_progress";
    //   await cycle.save();
    // }

    // ✅ Mettre à jour le statut du cycle
const totalPayments = await TontinePayment.countDocuments({
  tontine: tontineId,
  cycle: cycle._id,
});

const totalPaid = await TontinePayment.countDocuments({
  tontine: tontineId,
  cycle: cycle._id,
  hasPaid: true,
});

if (totalPayments > 0 && totalPayments === totalPaid) {
  cycle.status = "completed";
  cycle.isCompleted = true;
  cycle.completedAt = new Date();
} else if (cycle.status === "pending") {
  cycle.status = "in_progress";
}

await cycle.save();


    // ✅ Si tous ont payé → distribuer au bénéficiaire
    const unpaidCount = await TontinePayment.countDocuments({
      tontine: tontineId,
      cycle: cycle._id,
      hasPaid: false,
    });

    // if (unpaidCount === 0) {
    //   const cycleBeneficiary = tontine.members[cycle.cycleNumber - 1];
    //   if (cycleBeneficiary) {
    //     const beneficiary = await User.findById(cycleBeneficiary.user);
    //     if (beneficiary && tontine.virtualAccount.balance > 0) {
    //       beneficiary.virtualAccount.balance += tontine.virtualAccount.balance;
    //       await beneficiary.save();

    //       // Réinitialiser le solde de la tontine
    //       tontine.virtualAccount.balance = 0;
    //       await tontine.save();

    //       console.log(`🎉 ${beneficiary.name} a reçu ${contributionAmount} XOF.`);
    //     }
    //   }

    //   // Clôturer le cycle
    //   cycle.isCompleted = true;
    //   cycle.status = "completed";
    //   cycle.completedAt = new Date();
    //   await cycle.save();
    // }

    // ✅ Passer au cycle suivant ou terminer
    // if (tontine.currentCycle < tontine.totalCycles) {
    //   tontine.currentCycle += 1;
    //   await tontine.save();
    // } else {
    //   tontine.status = "completed";
    //   await tontine.save();
    // }

    return res.status(200).json({ msg: "✅ Paiement enregistré avec succès." });

  } catch (error) {
    console.error("❌ Erreur lors du paiement :", error);
    return res.status(500).json({ msg: "Erreur serveur lors du paiement." });
  }
};


export const closeTontineCycle = async (tontine, cycle) => {
  try {
    console.log(`🔄 Clôture du cycle ${cycle.cycleNumber} pour la tontine ${tontine.name}...`);

    // ✅ Trouver le bénéficiaire du cycle (ordre d’enrôlement)
    const members = tontine.members.sort((a, b) => a.joinedAt - b.joinedAt);
    const beneficiaryIndex = (cycle.cycleNumber - 1) % members.length;
    const beneficiary = await User.findById(members[beneficiaryIndex].user);

    if (!beneficiary) {
      console.error("❌ Impossible de trouver le bénéficiaire du cycle.");
      return;
    }

    // ✅ Transférer les fonds au bénéficiaire
    const collectedAmount = tontine.virtualAccount.balance;
    tontine.virtualAccount.balance = 0; // Remettre à zéro après paiement
    await tontine.save();

    // ✅ Créditer le compte virtuel du bénéficiaire
    beneficiary.virtualAccount.balance += collectedAmount;
    await beneficiary.save();

    // ✅ Marquer le cycle comme terminé
    cycle.isCompleted = true;
    await cycle.save();

    console.log(`✅ Cycle ${cycle.cycleNumber} terminé : ${beneficiary.name} a reçu ${collectedAmount} XOF.`);

    // ✅ Passer au cycle suivant
    tontine.currentCycle += 1;
    if (tontine.currentCycle > tontine.totalCycles) {
      tontine.status = "completed";
    }
    await tontine.save();

    // ✅ Envoyer une notification au bénéficiaire
    const message = `🎉 Félicitations ${beneficiary.name} ! Vous avez reçu ${collectedAmount} XOF dans la tontine "${tontine.name}".`;
    await sendSMS(beneficiary.phone, message);

  } catch (error) {
    console.error("❌ Erreur lors de la clôture du cycle :", error);
  }
};





export const getActiveTontinesCount = async (req, res) => {
  try {
    const activeTontinesCount = await Tontine.countDocuments({ status: "active" });
    res.status(200).json({ activeTontinesCount });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des tontines actives :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};



export const assignCycleBeneficiary = async (req, res) => {
  try {
    const { tontineId, cycleId } = req.params;
    const { beneficiaryId } = req.body;
    const userId = req.user._id;




    // ✅ Vérifier l'identité de l'initiateur avec mot de passe
    const initiator = await User.findById(userId).select("+password");
    if (!initiator) return res.status(404).json({ msg: "Initiateur introuvable." });

    const isMatch = await bcrypt.compare(password, initiator.password);
    if (!isMatch) {
      return res.status(403).json({ msg: "Mot de passe incorrect. Action refusée." });
    }


    const tontine = await Tontine.findById(tontineId);
    if (!tontine) return res.status(404).json({ msg: "Tontine non trouvée." });

    // Vérifier que c'est l'initiateur
    if (String(tontine.initiator) !== String(userId)) {
      return res.status(403).json({ msg: "Seul l’initiateur peut désigner un bénéficiaire." });
    }

    const cycle = await TontineCycle.findById(cycleId);
    if (!cycle || String(cycle.tontine) !== tontineId) {
      return res.status(404).json({ msg: "Cycle introuvable." });
    }

    if (cycle.isCompleted || cycle.beneficiary) {
      return res.status(400).json({ msg: "Ce cycle est déjà complété ou a un bénéficiaire." });
    }

    // Vérifier que tous les membres ont payé
    const unpaid = await TontinePayment.countDocuments({
      tontine: tontineId,
      cycle: cycleId,
      hasPaid: false,
    });

    if (unpaid > 0) {
      return res.status(400).json({ msg: "Tous les membres n'ont pas encore payé ce cycle." });
    }

    const beneficiary = await User.findById(beneficiaryId);
    if (!beneficiary) return res.status(404).json({ msg: "Bénéficiaire introuvable." });

    // Vérifier que ce membre n’a pas encore été bénéficiaire
    const alreadyBeneficiary = tontine.beneficiaries.includes(beneficiaryId);
    if (alreadyBeneficiary) {
      return res.status(400).json({ msg: "Ce membre a déjà reçu sa part." });
    }

    const amountToTransfer = tontine.virtualAccount.balance || 0;
    if (amountToTransfer <= 0) {
      return res.status(400).json({ msg: "Aucun fond disponible à transférer." });
    }

    // 💸 Transférer au bénéficiaire
    beneficiary.virtualAccount.balance += amountToTransfer;
    await beneficiary.save();

    // ✅ Mettre à jour la tontine
    tontine.virtualAccount.balance = 0;
    tontine.beneficiaries.push(beneficiaryId);
    await tontine.save();

    // ✅ Mettre à jour le cycle
    cycle.beneficiary = beneficiaryId;
    cycle.isCompleted = true;
    cycle.status = "completed";
    await cycle.save();

    res.status(200).json({
      msg: "✅ Bénéficiaire assigné et paiement transféré.",
      beneficiary: {
        name: beneficiary.name,
        phone: beneficiary.phone,
        amount: amountToTransfer,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de l’assignation du bénéficiaire :", error);
    res.status(500).json({ msg: "Erreur serveur lors de l’assignation." });
  }
};




export const serveBeneficiary = async (req, res) => {
  try {
    const { tontineId, cycleId } = req.params;
    const { beneficiaryId } = req.body;
    const initiatorId = req.user._id;

    const tontine = await Tontine.findById(tontineId);
    if (!tontine) return res.status(404).json({ msg: "Tontine non trouvée." });

    // ✅ Vérifier que l'utilisateur connecté est bien l’initiateur
    if (String(tontine.initiator) !== String(initiatorId)) {
      return res.status(403).json({ msg: "Seul l’initiateur peut effectuer cette opération." });
    }

    const cycle = await TontineCycle.findById(cycleId);
    if (!cycle || String(cycle.tontine) !== tontineId) {
      return res.status(404).json({ msg: "Cycle introuvable." });
    }

    // ✅ Vérifier que tous les paiements ont été effectués
    const unpaid = await TontinePayment.countDocuments({
      tontine: tontineId,
      cycle: cycleId,
      hasPaid: false,
    });
    if (unpaid > 0) {
      return res.status(400).json({ msg: "Tous les membres n'ont pas encore payé." });
    }

    // ✅ Vérifier que le bénéficiaire est bien membre
    const isMember = tontine.members.some((m) => String(m.user) === String(beneficiaryId));
    if (!isMember) {
      return res.status(400).json({ msg: "Ce membre n'appartient pas à la tontine." });
    }

    // ✅ Vérifier s'il a déjà été servi
    if (tontine.beneficiaries.includes(beneficiaryId)) {
      return res.status(400).json({ msg: "Ce membre a déjà reçu sa part." });
    }

    const beneficiary = await User.findById(beneficiaryId);
    if (!beneficiary) return res.status(404).json({ msg: "Utilisateur non trouvé." });

    // ✅ Calcul des frais
    const montantTotal = tontine.virtualAccount.balance;
    const fraisGestion = (2 / 100) * montantTotal;
    const taxe = (19 / 100) * fraisGestion;
    const montantNet = montantTotal - fraisGestion - taxe;

    // ✅ Créditer le compte du bénéficiaire
    beneficiary.virtualAccount.balance += montantNet;
    await beneficiary.save();

    // ✅ Mettre à jour les informations
    tontine.virtualAccount.balance = 0;
    tontine.beneficiaries.push(beneficiaryId);
    await tontine.save();

    cycle.beneficiary = beneficiaryId;
    cycle.isCompleted = true;
    cycle.status = "completed";
    cycle.completedAt = new Date();
    await cycle.save();

    if (tontine.currentCycle < tontine.totalCycles) {
      tontine.currentCycle += 1;
      await tontine.save();
    } else {
      tontine.status = "completed";
      await tontine.save();
    }
    
    // ✅ Envoyer un SMS de notification
const message = `🎉 Félicitations ${beneficiary.name} ! Vous avez reçu ${montantNet.toLocaleString()} XOF dans la tontine "${tontine.name}". Connectez-vous à l'application pour voir les détails.`;
await sendSMS(beneficiary.phone, message);
console.log(`📨 SMS envoyé à ${beneficiary.phone}`);


    return res.status(200).json({
      msg: `✅ ${beneficiary.name} a reçu ${montantNet.toLocaleString()} XOF après déduction des frais.`,
      details: {
        montantTotal,
        fraisGestion,
        taxe,
        montantNet,
        beneficiary: { name: beneficiary.name, phone: beneficiary.phone },
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors du transfert :", error);
    res.status(500).json({ msg: "Erreur serveur lors du transfert." });
  }
};
