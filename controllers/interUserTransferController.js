// interUserTransferController.js

import User from "../models/User.js";
import InterUserTransfer from "../models/InterUserTransfer.js";
import { calculateFees } from "../utils/feeCalculator.js";
import { sendSMS } from "../services/smsService.js";

// Créer un transfert entre utilisateurs


export const createInterUserTransfer = async (req, res) => {
    try {
      const { recipientPhone, amount, applyCommission } = req.body;

      // Vérification des champs obligatoires
      if (!recipientPhone || !amount) {
        return res.status(400).json({ msg: "Tous les champs sont requis." });
      }

      // Conversion et validation du montant
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ msg: "Montant invalide. Veuillez entrer un nombre valide." });
      }

      // Récupérer l'expéditeur depuis le middleware d'authentification
      const sender = req.user;
      if (!sender) {
        return res.status(401).json({ msg: "Utilisateur non authentifié." });
      }

      // Nettoyer le numéro de téléphone du destinataire
      const cleanRecipientPhone = recipientPhone.trim();

     

      let recipient = await User.findOne({ phone: cleanRecipientPhone });

if (!recipient) {
  // ✅ Créer automatiquement un nouveau compte utilisateur pour le destinataire
  recipient = new User({
    name: "Nouveau Utilisateur",
    phone: cleanRecipientPhone,
    virtualAccount: { balance: 0 }
  });
  await recipient.save();
}


      // Calcul des frais (commission et taxe)
      const commissionFlag = (applyCommission !== undefined) ? applyCommission : true;
      const { commission, tax } = commissionFlag ? calculateFees(numericAmount) : { commission: 0, tax: 0 };

      // Déterminer le montant net reçu par le bénéficiaire
      const netAmount = commissionFlag ? (numericAmount - (commission + tax)) : numericAmount;
      if (netAmount <= 0) {
        return res.status(400).json({ msg: "Le montant après déduction des frais est invalide." });
      }

      // Vérifier que l'expéditeur a suffisamment de fonds
      if (sender.virtualAccount.balance < numericAmount) {
        return res.status(400).json({ msg: "Fonds insuffisants dans votre compte virtuel." });
      }

      // ✅ Débiter le compte virtuel de l'expéditeur
      sender.virtualAccount.balance -= numericAmount;
      await sender.save();

      // ✅ Créditer le compte virtuel du bénéficiaire
      recipient.virtualAccount.balance += netAmount;
      await recipient.save();

      // Créer l'enregistrement du transfert
      const newTransfer = new InterUserTransfer({
        sender: sender._id,
        receiver: recipient._id,
        senderPhone: sender.phone,
        receiverPhone: recipient.phone,
        amount: numericAmount,
        commission,
        tax,
        netAmount,
        applyCommission: commissionFlag,
        status: "completed",
      });

      await newTransfer.save();

      // Envoyer les notifications SMS
      await sendSMS(sender.phone, `Votre compte a été débité de ${numericAmount.toLocaleString()} XOF pour un transfert vers ${recipient.name}.`);
      await sendSMS(recipient.phone, `Vous avez reçu ${netAmount.toLocaleString()} XOF d'un transfert de ${sender.name}.`);

      return res.status(201).json({
        msg: "Transfert effectué avec succès.",
        transfer: newTransfer,
        senderNewBalance: sender.virtualAccount.balance,
        receiverNewBalance: recipient.virtualAccount.balance, // ✅ Ajout du nouveau solde du bénéficiaire
      });

    } catch (error) {
      console.error("Erreur lors du transfert inter-utilisateur:", error);
      return res.status(500).json({ msg: "Erreur du serveur." });
    }
};


// Récupérer l'historique des transferts pour l'utilisateur connecté (envoi et réception)
// export const getInterUserTransfers = async (req, res) => {
//     try {
//       const transfers = await InterUserTransfer.find({
//         $or: [{ sender: req.user._id }, { receiver: req.user._id }]
//       }).sort({ createdAt: -1 });
  
//       console.log("📌 Transferts récupérés :", transfers); // Ajout du log
  
//       res.status(200).json(transfers);
//     } catch (error) {
//       console.error("❌ Erreur lors de la récupération des transferts :", error);
//       res.status(500).json({ msg: "Erreur du serveur." });
//     }
//   };


// ✅ Récupérer l'historique des transferts pour l'utilisateur connecté (envoi et réception)
export const getInterUserTransfers = async (req, res) => {
  try {
    const transfers = await InterUserTransfer.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    })
    .sort({ createdAt: -1 })
    .populate("sender", "name phone")     // ✅ Pour afficher les infos de l'expéditeur
    .populate("receiver", "name phone");  // ✅ Pour afficher les infos du bénéficiaire

    console.log("📌 Transferts récupérés :", transfers);

    res.status(200).json(transfers);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des transferts :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};

  

// Récupérer les détails d'un transfert spécifique par son ID
export const getInterUserTransferById = async (req, res) => {
  try {
    const transfer = await InterUserTransfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ msg: "Transfert non trouvé." });
    }
    // Vérifier que l'utilisateur connecté est soit l'expéditeur, soit le bénéficiaire
    if (
      transfer.sender.toString() !== req.user._id.toString() &&
      transfer.receiver.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ msg: "Accès refusé." });
    }
    res.status(200).json(transfer);
  } catch (error) {
    console.error("Erreur lors de la récupération du transfert:", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};



export const getUserBalance = async (req, res) => {
    try {
      // req.user est rempli par le middleware authenticateUser
      const balance = req.user.virtualAccount?.balance || 0;
      return res.status(200).json({ balance });
    } catch (error) {
      console.error("Erreur lors de la récupération du solde:", error);
      return res.status(500).json({ msg: "Erreur du serveur." });
    }
  };



  // Vérifier l'existence d'un utilisateur par numéro de téléphone
export const checkUserByPhone = async (req, res) => {
    try {
      const { phone } = req.params;
      const cleanPhone = phone.trim();
      const user = await User.findOne({ phone: cleanPhone });
      if (user) {
        return res.status(200).json({ exists: true, user });
      } else {
        return res.status(200).json({ exists: false });
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du destinataire :", error);
      return res.status(500).json({ msg: "Erreur du serveur." });
    }
  };