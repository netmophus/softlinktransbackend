
import Tontine from "../models/Tontine.js";
import User from "../models/User.js";
import { sendSMS } from "../services/smsService.js";
import TontineCycle from "../models/TontineCycle.js";
import TontinePayment from "../models/TontinePayment.js";
import bcrypt from "bcryptjs";
import TontineCommissionHistory from "../models/TontineCommissionHistory.js";


// ✅ Créer une tontine


export const createTontine = async (req, res) => {
  try {
    let { name, contributionAmount, totalCycles, startDate, frequency } = req.body;

    // 🔐 Générer un suffixe unique
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    name = `${name.trim()}-${uniqueSuffix}`;

    // ✅ Traitement de la date (ex: "2025-05-30")
    if (startDate) {
      console.log("📥 startDate reçu :", startDate);
      const parsedDate = new Date(startDate);
      console.log("📆 Date JS construite :", parsedDate);

      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ msg: "Date de départ invalide." });
      }

      startDate = parsedDate;
    } else {
      return res.status(400).json({ msg: "Date de départ manquante." });
    }

    const initiator = req.user._id;

    // 🛑 Vérifier que l'utilisateur n'est pas déjà dans une tontine active
    const isInitiator = await Tontine.exists({ initiator, status: "active" });
    const isMember = await Tontine.exists({
      status: "active",
      "members.user": initiator
    });
    if (isInitiator || isMember) {
      return res.status(400).json({
        msg: "❌ Vous participez déjà à une tontine active (en tant qu’initiateur ou membre)."
      });
    }

    // ✅ Limite globale
    const MAX_TONTINES = 200;
    const activeTontinesCount = await Tontine.countDocuments({ status: "active" });
    if (activeTontinesCount >= MAX_TONTINES) {
      return res.status(400).json({ msg: "🚫 Limite atteinte : 200 tontines actives." });
    }

    // 🔍 Vérifier doublon
    const existingTontine = await Tontine.findOne({ name, initiator });
    if (existingTontine) {
      return res.status(400).json({ msg: "Vous avez déjà une tontine avec ce nom." });
    }

    // ✅ Créer la tontine
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
      members: [{ user: initiator, joinedAt: new Date() }]
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

    // 💰 Paiements pré-remplis pour l’initiateur
    const payments = cycles.map((cycle) => ({
      tontine: tontine._id,
      user: initiator,
      cycle: cycle._id,
      amountPaid: 0,
      hasPaid: false,
      paymentDate: null,
      paymentMethod: "compte_virtuel"
    }));

    await TontinePayment.insertMany(payments);

    console.log("✅ Tontine et cycles créés avec succès :", tontine.name);
    return res.status(201).json({
      msg: "✅ Tontine et cycles créés avec succès.",
      tontine,
      cycles
    });

  } catch (error) {
    console.error("❌ Erreur lors de la création de la tontine :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};





export const enrollMember = async (req, res) => {
  try {
    const { tontineId } = req.params;
    const { phone } = req.body;
    const initiatorId = req.user._id;

    console.log("📡 Tentative d'enrôlement avec le téléphone :", phone);

    // 🔍 Vérifier si l'utilisateur existe et récupérer son rôle
    const user = await User.findOne({ phone }).select("_id name phone role");

    if (!user) {
      console.error("❌ Utilisateur introuvable :", phone);
      return res.status(404).json({ msg: "Utilisateur non trouvé." });
    }

    // 🛑 1. L'utilisateur est-il déjà initiateur d'une tontine active ?
    const isAlreadyInitiator = await Tontine.exists({ initiator: user._id, status: "active" });
    if (isAlreadyInitiator) {
      return res.status(400).json({
        msg: "❌ Cet utilisateur est déjà initiateur d'une tontine active. Il ne peut pas rejoindre une nouvelle tontine tant que l’ancienne n’est pas clôturée.",
      });
    }

    // 🛑 2. L'utilisateur est-il déjà membre d'une autre tontine active ?
    const isAlreadyMember = await Tontine.exists({
      status: "active",
      "members.user": user._id,
      _id: { $ne: tontineId },
    });
    if (isAlreadyMember) {
      return res.status(400).json({
        msg: "❌ Cet utilisateur participe déjà à une tontine active. Il ne peut pas rejoindre une nouvelle tontine tant que l’ancienne n’est pas clôturée.",
      });
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
    const isAlreadyEnrolled = tontine.members.some((m) => String(m.user) === String(user._id));
    if (isAlreadyEnrolled) {
      return res.status(400).json({ msg: "⚠️ Membre déjà enrôlé dans cette tontine." });
    }

    // 📅 Initialiser les paiements pour chaque cycle
    const payments = [];
    const cycles = await TontineCycle.find({ tontine: tontineId });

    for (const cycle of cycles) {
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
    const message = `📢 Bonjour ${user.name} ! Vous avez été ajouté à la tontine "${tontine.name}".\nConnectez-vous à l'application pour consulter les conditions et vérifier vos échéances.`;

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


    // **ICI TU AJOUTES L’HISTORIQUE**
await TontineCommissionHistory.create({
  tontine: tontineId,
  cycle: cycleId,
  beneficiary: beneficiaryId,
  initiator: initiatorId,
  montantTotal,
  fraisGestion,
  taxe,
  montantNet,
  servedAt: new Date()
});

    
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

export const getActiveTontinesReport = async (req, res) => {
  try {
    const tontines = await Tontine.find({ status: "active" })
      .populate("initiator", "name phone")
      .lean();

    const result = await Promise.all(
      tontines.map(async (tontine) => {
        const memberCount = tontine.members.length;

        return {
          _id: tontine._id,
          name: tontine.name,
          startDate: tontine.startDate,
          contributionAmount: tontine.contributionAmount,
          totalCycles: tontine.totalCycles,
          currentCycle: tontine.currentCycle,
          status: tontine.status,
          virtualBalance: tontine.virtualAccount?.balance || 0,
          initiator: tontine.initiator,
          memberCount,
        };
      })
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur lors du reporting des tontines actives :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};


export const getAllTontineMembersReport = async (req, res) => {
  try {
    const tontines = await Tontine.find({ status: "active" })
      .select("members")
      .lean();

    const memberCounts = {};

    tontines.forEach((tontine) => {
      tontine.members.forEach((m) => {
        const uid = String(m.user);
        if (!memberCounts[uid]) {
          memberCounts[uid] = 1;
        } else {
          memberCounts[uid]++;
        }
      });
    });

    const memberIds = Object.keys(memberCounts);

    const users = await User.find({ _id: { $in: memberIds } })
      .select("name phone city isActive isLocked")
      .populate("city", "name")
      .lean();

    const report = users.map((user) => ({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      city: user.city?.name || "—",
      isActive: user.isActive,
      isLocked: user.isLocked,
      tontinesJoined: memberCounts[user._id],
    }));

    res.status(200).json(report);
  } catch (error) {
    console.error("❌ Erreur lors du reporting des membres enrôlés :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};



export const getTotalCollectedReport = async (req, res) => {
  try {
    const payments = await TontinePayment.aggregate([
      { $match: { hasPaid: true } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amountPaid" },
        },
      },
    ]);

    const totalCollected = payments.length > 0 ? payments[0].totalAmount : 0;

    res.status(200).json({ totalCollected });
  } catch (error) {
    console.error("❌ Erreur lors du reporting du montant collecté :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};


export const getTontinesCycleProgressReport = async (req, res) => {
  try {
    const tontines = await Tontine.find({ status: "active" })
      .populate("initiator", "name phone")
      .lean();

    const result = await Promise.all(
      tontines.map(async (tontine) => {
        const currentCycleData = await TontineCycle.findOne({
          tontine: tontine._id,
          cycleNumber: tontine.currentCycle,
        }).lean();

        return {
          _id: tontine._id,
          name: tontine.name,
          initiator: tontine.initiator,
          currentCycle: tontine.currentCycle,
          totalCycles: tontine.totalCycles,
          cycleStatus: currentCycleData?.status || "non défini",
          dueDate: currentCycleData?.dueDate || null,
          virtualBalance: tontine.virtualAccount?.balance || 0,
        };
      })
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur progression des cycles :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};



export const getBeneficiariesHistoryReport = async (req, res) => {
  try {
    const completedCycles = await TontineCycle.find({ isCompleted: true, beneficiary: { $ne: null } })
      .populate("tontine", "name")
      .populate("beneficiary", "name phone")
      .lean();

    const result = completedCycles.map((cycle) => ({
      tontineName: cycle.tontine?.name || "—",
      cycleNumber: cycle.cycleNumber,
      beneficiaryName: cycle.beneficiary?.name || "—",
      beneficiaryPhone: cycle.beneficiary?.phone || "—",
      date: cycle.completedAt || cycle.updatedAt || null,
      // Optionnel : montant transféré
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur lors du reporting des bénéficiaires :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};


export const getPendingCyclesReport = async (req, res) => {
  try {
    const cycles = await TontineCycle.find({
      isCompleted: false,
    })
      .populate("tontine", "name virtualAccount initiator")
      .populate("beneficiary", "name phone")
      .lean();

    const result = [];

    for (const cycle of cycles) {
      const totalPayments = await TontinePayment.countDocuments({
        tontine: cycle.tontine._id,
        cycle: cycle._id,
      });

      const paidPayments = await TontinePayment.countDocuments({
        tontine: cycle.tontine._id,
        cycle: cycle._id,
        hasPaid: true,
      });

      if (totalPayments > 0 && totalPayments === paidPayments) {
        result.push({
          tontineName: cycle.tontine.name,
          cycleNumber: cycle.cycleNumber,
          dueDate: cycle.dueDate,
          cycleId: cycle._id,
          tontineId: cycle.tontine._id,
          initiatorName: cycle.tontine.initiator?.name || "—",
          initiatorPhone: cycle.tontine.initiator?.phone || "—",
          status: cycle.status,
          isReady: true,
          balance: cycle.tontine.virtualAccount?.balance || 0,
        });
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur cycles à clôturer :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};



// export const updateTontineByInitiator = async (req, res) => {
//   try {
//     const { tontineId } = req.params;
//     const initiatorId = req.user._id;
//     const {
//       name,
//       contributionAmount,
//       totalCycles,
//       frequency,
//       startDate,
//     } = req.body;

//     // 🔒 Vérifier si la tontine existe et appartient à l'utilisateur
//     const tontine = await Tontine.findById(tontineId);
//     if (!tontine) {
//       return res.status(404).json({ msg: "Tontine non trouvée." });
//     }

//     if (String(tontine.initiator) !== String(initiatorId)) {
//       return res.status(403).json({ msg: "Accès refusé. Vous n'êtes pas l'initiateur de cette tontine." });
//     }

//     if (tontine.status !== "active") {
//       return res.status(400).json({ msg: "Seules les tontines actives peuvent être modifiées." });
//     }





//    if (startDate && String(startDate) !== tontine.startDate.toISOString().split("T")[0]) {
//   const existingPaid = await TontinePayment.exists({
//     tontine: tontine._id,
//     hasPaid: true,
//   });

//   if (existingPaid) {
//     return res.status(400).json({
//       msg: "❌ Impossible de modifier la date de démarrage : des paiements ont déjà été effectués.",
//     });
//   }

//   // ✅ Vérification du format de la date (JJ-MM-AAAA)
//   const [day, month, year] = startDate.split("-");
//   const parsedDate = new Date(`${year}-${month}-${day}`);

//   if (isNaN(parsedDate)) {
//     return res.status(400).json({ msg: "❌ Format de date invalide." });
//   }

//   tontine.startDate = parsedDate;
// }







//     // 🔒 Blocage modification fréquence ou totalCycles si un cycle a commencé
//     const firstCycleStarted = await TontineCycle.exists({
//       tontine: tontine._id,
//       cycleNumber: 1,
//       status: { $ne: "pending" }, // started = in_progress ou completed
//     });

//     if (firstCycleStarted) {
//       if (frequency && frequency !== tontine.frequency) {
//         return res.status(400).json({
//           msg: "❌ Impossible de modifier la fréquence : un cycle a déjà démarré.",
//         });
//       }

//       if (totalCycles && totalCycles !== tontine.totalCycles) {
//         return res.status(400).json({
//           msg: "❌ Impossible de modifier le nombre de cycles : un cycle a déjà démarré.",
//         });
//       }
//     }

//     // ✅ Appliquer les autres mises à jour autorisées
//     tontine.name = name || tontine.name;
//     tontine.contributionAmount = contributionAmount || tontine.contributionAmount;
//     tontine.frequency = frequency || tontine.frequency;
//     tontine.totalCycles = totalCycles || tontine.totalCycles;


//     // 🔄 Supprimer les cycles et paiements si totalCycles a diminué
// if (totalCycles < tontine.totalCycles) {
//   // Récupérer tous les cycles de la tontine
//   const allCycles = await TontineCycle.find({ tontine: tontine._id });

//   // Trouver les cycles à supprimer
//   const extraCycles = allCycles.filter(c => c.cycleNumber > totalCycles);
//   const extraCycleIds = extraCycles.map(c => c._id);

//   // Vérification : s'assurer qu'aucun paiement ou bénéficiaire n'existe
//   const hasPaidOrServed = await TontinePayment.exists({
//     cycle: { $in: extraCycleIds },
//     hasPaid: true
//   }) || await TontineCycle.exists({
//     _id: { $in: extraCycleIds },
//     beneficiary: { $ne: null }
//   });

//   if (hasPaidOrServed) {
//     return res.status(400).json({
//       msg: "❌ Impossible de réduire le nombre de cycles : un cycle à supprimer contient déjà des paiements ou un bénéficiaire."
//     });
//   }

//   // 🔥 Supprimer les paiements liés à ces cycles
//   await TontinePayment.deleteMany({ cycle: { $in: extraCycleIds } });

//   // 🧹 Supprimer les cycles
//   await TontineCycle.deleteMany({ _id: { $in: extraCycleIds } });
// }


//     await tontine.save();



//   // 🔄 Mettre à jour les dates des cycles si fréquence ou date changée (et aucun paiement ni bénéficiaire)
// const hasAnyPayment = await TontinePayment.exists({
//   tontine: tontine._id,
//   hasPaid: true,
// });

// const hasAnyBeneficiary = await TontineCycle.exists({
//   tontine: tontine._id,
//   beneficiary: { $ne: null },
// });

// if (!hasAnyPayment && !hasAnyBeneficiary) {
//   const newStartDate = tontine.startDate;
//   const cycles = await TontineCycle.find({ tontine: tontine._id }).sort("cycleNumber");

//   for (let i = 0; i < cycles.length; i++) {
//     const cycle = cycles[i];
//     const dueDate = new Date(newStartDate);
//     if (tontine.frequency === "weekly") {
//       dueDate.setDate(newStartDate.getDate() + i * 7);
//     } else if (tontine.frequency === "monthly") {
//       dueDate.setMonth(newStartDate.getMonth() + i);
//     }

//     cycle.dueDate = dueDate;
//     await cycle.save();
//   }
// }


//     res.status(200).json({ msg: "✅ Tontine modifiée avec succès.", tontine });
//   } catch (error) {
//     console.error("❌ Erreur lors de la modification de la tontine :", error);
//     res.status(500).json({ msg: "Erreur serveur lors de la modification." });
//   }
// };

export const updateTontineByInitiator = async (req, res) => {
  try {
    const { tontineId } = req.params;
    const initiatorId = req.user._id;
    const {
      name,
      contributionAmount,
      totalCycles,
      frequency,
      startDate,
    } = req.body;

    const tontine = await Tontine.findById(tontineId);
    if (!tontine) {
      return res.status(404).json({ msg: "Tontine non trouvée." });
    }

    if (String(tontine.initiator) !== String(initiatorId)) {
      return res.status(403).json({ msg: "Accès refusé. Vous n'êtes pas l'initiateur de cette tontine." });
    }

    if (tontine.status !== "active") {
      return res.status(400).json({ msg: "Seules les tontines actives peuvent être modifiées." });
    }

    // ✅ Conversion de la date si elle a changé
    if (startDate && String(startDate) !== tontine.startDate.toISOString().split("T")[0]) {
      const existingPaid = await TontinePayment.exists({
        tontine: tontine._id,
        hasPaid: true,
      });

      if (existingPaid) {
        return res.status(400).json({
          msg: "❌ Impossible de modifier la date de démarrage : des paiements ont déjà été effectués.",
        });
      }

      const [day, month, year] = startDate.split("-");
      const parsedDate = new Date(`${year}-${month}-${day}`);
      if (isNaN(parsedDate)) {
        return res.status(400).json({ msg: "❌ Format de date invalide." });
      }

      tontine.startDate = parsedDate;
    }

    // 🔒 Blocage de fréquence et totalCycles si un cycle a démarré
    const firstCycleStarted = await TontineCycle.exists({
      tontine: tontine._id,
      cycleNumber: 1,
      status: { $ne: "pending" },
    });

    if (firstCycleStarted) {
      if (frequency && frequency !== tontine.frequency) {
        return res.status(400).json({
          msg: "❌ Impossible de modifier la fréquence : un cycle a déjà démarré.",
        });
      }

      if (totalCycles && totalCycles !== tontine.totalCycles) {
        return res.status(400).json({
          msg: "❌ Impossible de modifier le nombre de cycles : un cycle a déjà démarré.",
        });
      }
    }

    // ✅ Appliquer les modifications locales
    tontine.name = name || tontine.name;
    tontine.contributionAmount = contributionAmount || tontine.contributionAmount;
    const newTotalCycles = totalCycles || tontine.totalCycles;
    const newFrequency = frequency || tontine.frequency;
    tontine.frequency = newFrequency;

    






    // 🔄 Supprimer les cycles et paiements si on réduit le nombre de cycles
if (newTotalCycles < tontine.totalCycles) {
  const allCycles = await TontineCycle.find({ tontine: tontine._id });
  const extraCycles = allCycles.filter(c => c.cycleNumber > newTotalCycles);
  const extraCycleIds = extraCycles.map(c => c._id);

  const hasPaidOrServed = await TontinePayment.exists({
    cycle: { $in: extraCycleIds },
    hasPaid: true,
  }) || await TontineCycle.exists({
    _id: { $in: extraCycleIds },
    beneficiary: { $ne: null }
  });

  if (hasPaidOrServed) {
    return res.status(400).json({
      msg: "❌ Impossible de réduire le nombre de cycles : certains cycles ont déjà des paiements ou un bénéficiaire.",
    });
  }

  // 🔥 Supprimer les paiements liés à ces cycles
  await TontinePayment.deleteMany({ cycle: { $in: extraCycleIds } });

  // 🧹 Supprimer les cycles
  await TontineCycle.deleteMany({ _id: { $in: extraCycleIds } });

  // 🧹 Supprimer les paiements orphelins (liés à des cycles supprimés)
  await TontinePayment.deleteMany({
    tontine: tontine._id,
    cycle: { $nin: await TontineCycle.find({ tontine: tontine._id }).distinct("_id") },
  });

  // 🧹 Supprimer les paiements de membres qui ne sont plus dans la tontine
  const currentMemberIds = tontine.members.map((m) => String(m.user));
  await TontinePayment.deleteMany({
    tontine: tontine._id,
    user: { $nin: currentMemberIds },
  });
}




    tontine.totalCycles = newTotalCycles;

    await tontine.save();

    // 🧹 Nettoyage des cycles : retirer les paiements obsolètes du tableau `payments`
const cyclesToClean = await TontineCycle.find({ tontine: tontine._id });

for (const cycle of cyclesToClean) {
  const validPayments = await TontinePayment.find({ cycle: cycle._id }).select("_id");
  const validPaymentIds = validPayments.map(p => p._id.toString());

  // Filtrer uniquement les IDs valides dans le tableau `payments` du cycle
  cycle.payments = (cycle.payments || []).filter(pId => validPaymentIds.includes(pId.toString()));
  await cycle.save();
}


    // 🔁 Recalculer les dates si aucun paiement ou bénéficiaire
    const hasAnyPayment = await TontinePayment.exists({
      tontine: tontine._id,
      hasPaid: true,
    });

    const hasAnyBeneficiary = await TontineCycle.exists({
      tontine: tontine._id,
      beneficiary: { $ne: null },
    });

    if (!hasAnyPayment && !hasAnyBeneficiary) {
      const cycles = await TontineCycle.find({ tontine: tontine._id }).sort("cycleNumber");
      const newStartDate = tontine.startDate;

      for (let i = 0; i < cycles.length; i++) {
        const cycle = cycles[i];
        const dueDate = new Date(newStartDate);

        if (newFrequency === "weekly") {
          dueDate.setDate(newStartDate.getDate() + i * 7);
        } else if (newFrequency === "monthly") {
          dueDate.setMonth(newStartDate.getMonth() + i);
        }

        cycle.dueDate = dueDate;
        await cycle.save();
      }
    }

    res.status(200).json({ msg: "✅ Tontine modifiée avec succès.", tontine });
  } catch (error) {
    console.error("❌ Erreur lors de la modification de la tontine :", error);
    res.status(500).json({ msg: "Erreur serveur lors de la modification." });
  }
};


export const getTontineById = async (req, res) => {
  try {
    const { tontineId } = req.params;
    const tontine = await Tontine.findById(tontineId);

    if (!tontine) {
      return res.status(404).json({ msg: "Tontine invalide ou non trouvée." });
    }

    res.status(200).json(tontine);
  } catch (error) {
    console.error("❌ Erreur :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};



export const getTontineWithMembers = async (req, res) => {
  try {
    const { tontineId } = req.params;

    const tontine = await Tontine.findById(tontineId).lean();
    if (!tontine) return res.status(404).json({ msg: "Tontine introuvable." });

    const members = await TontinePayment.find({ tontine: tontineId })
      .populate("user", "name phone")
      .lean();

    res.status(200).json({ tontine, members });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la tontine :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};

export const removeTontineMember = async (req, res) => {
  try {
    const { tontineId, memberId } = req.params;

    // 1️⃣ Vérifier la tontine
    const tontine = await Tontine.findById(tontineId);
    if (!tontine) {
      return res.status(404).json({ msg: "❌ Tontine introuvable. Opération annulée." });
    }

    // 2️⃣ Ne pas supprimer l'initiateur
    if (String(tontine.initiator) === String(memberId)) {
      return res.status(400).json({
        msg: "❌ L'initiateur de la tontine ne peut pas être supprimé.",
      });
    }

    // 3️⃣ Vérifier si le membre a déjà payé
    const hasPaid = await TontinePayment.exists({
      tontine: tontineId,
      user: memberId,
      hasPaid: true,
    });
    if (hasPaid) {
      return res.status(400).json({
        msg: "❌ Ce membre ne peut pas être supprimé car il a déjà effectué au moins un paiement.",
      });
    }

    // 4️⃣ Vérifier si le membre a été bénéficiaire
    const wasBeneficiary = tontine.beneficiaries.some(
      (b) => String(b) === String(memberId)
    );
    if (wasBeneficiary) {
      return res.status(400).json({
        msg: "❌ Ce membre ne peut pas être supprimé car il a déjà reçu un versement.",
      });
    }

    // 5️⃣ Supprimer les paiements du membre
    await TontinePayment.deleteMany({ tontine: tontineId, user: memberId });

    // 6️⃣ Retirer le membre de la tontine
    tontine.members = tontine.members.filter((m) => String(m.user) !== String(memberId));
    await tontine.save();

    res.status(200).json({ msg: "✅ Membre retiré avec succès." });
  } catch (error) {
    console.error("❌ Erreur lors du retrait du membre :", error);
    res.status(500).json({ msg: "❌ Une erreur technique est survenue. Veuillez réessayer plus tard." });
  }
};




// export const replaceTontineMember = async (req, res) => {
//   try {
//     const { tontineId } = req.params;
//     const { oldMemberPhone, newMemberPhone } = req.body;
//     const initiatorId = req.user._id;

//     // 🔍 Charger la tontine
//     const tontine = await Tontine.findById(tontineId);
//     if (!tontine) return res.status(404).json({ msg: "Tontine introuvable." });

//     // 🔐 Vérifier que l'utilisateur est bien l'initiateur
//     if (String(tontine.initiator) !== String(initiatorId)) {
//       return res.status(403).json({ msg: "Accès refusé. Seul l’initiateur peut remplacer un membre." });
//     }

//     // 🔎 Trouver les deux utilisateurs
//     const oldMember = await User.findOne({ phone: oldMemberPhone });
//     const newMember = await User.findOne({ phone: newMemberPhone });

//     if (!oldMember || !newMember) {
//       return res.status(404).json({ msg: "Utilisateur introuvable (ancien ou nouveau membre)." });
//     }

//     if (String(oldMember._id) === String(newMember._id)) {
//       return res.status(400).json({ msg: "Les deux membres sont identiques." });
//     }

//  // 🔒 Interdire si le membre a déjà été bénéficiaire
// const alreadyBeneficiary = tontine.beneficiaries.includes(oldMember._id);
// if (alreadyBeneficiary) {
//   return res.status(400).json({
//     msg: "❌ Ce membre a déjà reçu sa part. Il ne peut pas être remplacé.",
//   });
// }

// // 🔒 Interdire si le membre a déjà payé au moins une fois
// const hasPaid = await TontinePayment.exists({
//   tontine: tontineId,
//   user: oldMember._id,
//   hasPaid: true,
// });
// if (hasPaid) {
//   return res.status(400).json({
//     msg: "❌ Ce membre a déjà effectué une cotisation. Il ne peut pas être remplacé.",
//   });
// }


//     // 🔒 Interdire si le nouveau membre est déjà dans la tontine
//     const alreadyIn = tontine.members.some((m) => String(m.user) === String(newMember._id));
//     if (alreadyIn) {
//       return res.status(400).json({ msg: "Le nouveau membre est déjà inscrit dans cette tontine." });
//     }

//     // ❌ Supprimer tous les paiements du membre sortant
//     await TontinePayment.deleteMany({ tontine: tontineId, user: oldMember._id });

//     // ❌ Supprimer du tableau des membres
//     tontine.members = tontine.members.filter((m) => String(m.user) !== String(oldMember._id));

//     // ✅ Ajouter le nouveau membre
//     tontine.members.push({ user: newMember._id, joinedAt: new Date() });
//     await tontine.save();

//     // ✅ Créer les paiements du nouveau membre
//     const cycles = await TontineCycle.find({ tontine: tontineId });
//     const payments = cycles.map((cycle) => ({
//       tontine: tontineId,
//       user: newMember._id,
//       cycle: cycle._id,
//       amountPaid: 0,
//       hasPaid: false,
//       paymentDate: null,
//       paymentMethod: "compte_virtuel",
//     }));

//     await TontinePayment.insertMany(payments);

//     res.status(200).json({
//       msg: "✅ Remplacement effectué avec succès.",
//       oldMember: { name: oldMember.name, phone: oldMember.phone },
//       newMember: { name: newMember.name, phone: newMember.phone },
//     });
//   } catch (error) {
//     console.error("❌ Erreur lors du remplacement du membre :", error);
//     res.status(500).json({ msg: "Erreur serveur lors du remplacement." });
//   }
// };




export const replaceTontineMember = async (req, res) => {
  try {
    const { tontineId } = req.params;
    const { oldMemberPhone, newMemberPhone, password } = req.body;
    const initiatorId = req.user._id;

    // 🔍 Charger la tontine
    const tontine = await Tontine.findById(tontineId);
    if (!tontine) return res.status(404).json({ msg: "Tontine introuvable." });

    // 🔐 Vérifier que l'utilisateur est bien l'initiateur
    if (String(tontine.initiator) !== String(initiatorId)) {
      return res.status(403).json({ msg: "Accès refusé. Seul l’initiateur peut remplacer un membre." });
    }

    // 🔎 Trouver les deux utilisateurs
    const oldMember = await User.findOne({ phone: oldMemberPhone });
    const newMember = await User.findOne({ phone: newMemberPhone });

    if (!oldMember || !newMember) {
      return res.status(404).json({ msg: "Utilisateur introuvable (ancien ou nouveau membre)." });
    }

    if (String(oldMember._id) === String(newMember._id)) {
      return res.status(400).json({ msg: "Les deux membres sont identiques." });
    }

    // ⛔ Interdire si on essaie de remplacer l'initiateur
    if (String(oldMember._id) === String(tontine.initiator)) {
      return res.status(400).json({
        msg: "❌ L’initiateur ne peut pas être remplacé.",
      });
    }

    // ⛔ Interdire si le membre a déjà été bénéficiaire
    const alreadyBeneficiary = tontine.beneficiaries.includes(oldMember._id);
    if (alreadyBeneficiary) {
      return res.status(400).json({
        msg: "❌ Ce membre a déjà reçu sa part. Il ne peut pas être remplacé.",
      });
    }

    // ⛔ Interdire si le membre a déjà cotisé
    const hasPaid = await TontinePayment.exists({
      tontine: tontineId,
      user: oldMember._id,
      hasPaid: true,
    });
    if (hasPaid) {
      return res.status(400).json({
        msg: "❌ Ce membre a déjà cotisé. Il ne peut pas être remplacé.",
      });
    }

    // ⛔ Interdire si le nouveau membre est déjà dans la tontine
    const alreadyIn = tontine.members.some((m) => String(m.user) === String(newMember._id));
    if (alreadyIn) {
      return res.status(400).json({ msg: "Le nouveau membre est déjà inscrit dans cette tontine." });
    }

    // ✅ Supprimer tous les paiements du membre sortant
    await TontinePayment.deleteMany({ tontine: tontineId, user: oldMember._id });

    // ✅ Supprimer du tableau des membres
    tontine.members = tontine.members.filter((m) => String(m.user) !== String(oldMember._id));

    // ✅ Ajouter le nouveau membre
    tontine.members.push({ user: newMember._id, joinedAt: new Date() });
    await tontine.save();

    // ✅ Créer les paiements du nouveau membre
   

    const cycles = await TontineCycle.find({
  tontine: tontineId,
  cycleNumber: { $lte: tontine.totalCycles }, // ✅ protection importante
});


    const payments = cycles.map((cycle) => ({
      tontine: tontineId,
      user: newMember._id,
      cycle: cycle._id,
      amountPaid: 0,
      hasPaid: false,
      paymentDate: null,
      paymentMethod: "compte_virtuel",
    }));

    await TontinePayment.insertMany(payments);

    res.status(200).json({
      msg: "✅ Remplacement effectué avec succès.",
      oldMember: { name: oldMember.name, phone: oldMember.phone },
      newMember: { name: newMember.name, phone: newMember.phone },
    });
  } catch (error) {
    console.error("❌ Erreur lors du remplacement du membre :", error);
    res.status(500).json({ msg: "Erreur serveur lors du remplacement." });
  }
};
