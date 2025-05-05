import User from "../models/User.js";
import UserTransaction from "../models/UserTransaction.js";
import { sendSMS } from "../services/smsService.js"; // 📩 Pour envoyer une notification SMS

import { calculateFees } from "../utils/feeCalculator.js"; 
// ✅ Effectuer un transfert entre utilisateurs



// export const transferBetweenUsers = async (req, res) => {
//     try {
//       const { recipientPhone, amount } = req.body;
//       const senderId = req.user._id;
  
//       if (!recipientPhone || !amount || amount <= 0) {
//         return res.status(400).json({ msg: "Données invalides." });
//       }
  
//       const sender = await User.findById(senderId);
//       const recipient = await User.findOne({ phone: recipientPhone });
  
//       if (!recipient) {
//         return res.status(400).json({ msg: "Utilisateur destinataire introuvable." });
//       }
  
//       // 🔒 Blocage de l'auto-transfert
//       if (recipient._id.equals(sender._id)) {
//         return res.status(400).json({ msg: "❌ Vous ne pouvez pas vous envoyer de l'argent à vous-même." });
//       }
  
//       const { commission, tax } = calculateFees(amount);
//       const totalToDebit = amount + commission + tax;
  
//       if (sender.virtualAccount.balance < totalToDebit) {
//         return res.status(400).json({ msg: "Solde insuffisant pour le transfert et les frais." });
//       }
  
//       // 💸 Mise à jour des comptes
//       sender.virtualAccount.balance -= totalToDebit;
//       recipient.virtualAccount.balance += amount;
  
//       await sender.save();
//       await recipient.save();
  
//       await UserTransaction.create({
//         user: sender._id,
//         cashier: sender._id,
//         cashRegister: null,
//         type: "transfer",
//         amount,
//         netAmount: amount,
//         commissionAmount: commission,
//         taxAmount: tax,
//         applyCommission: true,
//       });
  
//       // 📩 Notifications
//       await sendSMS(sender.phone, `Vous avez transféré ${amount} XOF à ${recipient.name}. Frais: ${commission + tax} XOF.`);
//       await sendSMS(recipient.phone, `Vous avez reçu ${amount} XOF de ${sender.name}.`);
  
//       return res.status(200).json({ msg: "Transfert effectué avec succès." });
  
//     } catch (error) {
//       console.error("❌ Erreur lors du transfert :", error);
//       return res.status(500).json({ msg: "Erreur du serveur." });
//     }
//   };
  













// export const transferBetweenUsers = async (req, res) => {
//     try {
//         const { recipientPhone, amount } = req.body;
//         const senderId = req.user._id;

//         if (!recipientPhone || !amount || amount <= 0) {
//             return res.status(400).json({ msg: "Données invalides." });
//         }

//         // 🔹 Vérifier si le destinataire est un utilisateur existant
//         const recipient = await User.findOne({ phone: recipientPhone });
//         if (!recipient) {
//             return res.status(400).json({ msg: "Utilisateur destinataire introuvable." });
//         }

//         // 🔹 Vérifier le solde du compte de l'expéditeur
//         const sender = await User.findById(senderId);
//         if (sender.virtualAccount.balance < amount) {
//             return res.status(400).json({ msg: "Solde insuffisant." });
//         }

//         // 🔹 Débiter le compte de l'expéditeur et créditer le destinataire
//         sender.virtualAccount.balance -= amount;
//         recipient.virtualAccount.balance += amount;

//         // 🔹 Enregistrer la transaction
//         const transaction = await UserTransaction.create({
//             user: senderId,
//             cashier: senderId, // L'utilisateur effectue le transfert lui-même
//             cashRegister: null, // Pas de caisse impliquée
//             type: "transfer",
//             amount,
//             netAmount: amount,
//             commissionAmount: 0, // Pas de commission
//             taxAmount: 0,
//             applyCommission: false,
//         });

//         await sender.save();
//         await recipient.save();

//         // 📩 Envoyer un SMS de notification
//         const message = `Vous avez reçu ${amount} XOF de ${sender.name}. Nouveau solde : ${recipient.virtualAccount.balance} XOF.`;
//         await sendSMS(recipient.phone, message);

//         return res.status(200).json({ msg: "Transfert effectué avec succès." });
//     } catch (error) {
//         console.error("❌ Erreur lors du transfert :", error);
//         return res.status(500).json({ msg: "Erreur du serveur." });
//     }
// };

// ✅ Récupérer l'historique des transferts d'un utilisateur
export const getUserTransfers = async (req, res) => {
    try {
        
        // 🔁 Corrigé pour inclure la ville de retrait
            const transfers = await InterCityTransfer.find({
                sender: req.user._id
            })
            .populate("receiverCity", "name") // 🔥 Ajoute ceci
            .sort({ createdAt: -1 });
            

        return res.status(200).json(transactions);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des transferts :", error);
        return res.status(500).json({ msg: "Erreur du serveur." });
    }
};
