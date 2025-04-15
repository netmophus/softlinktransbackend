


import InterCityTransfer from "../models/InterCityTransfer.js";
import User from "../models/User.js";
import City from "../models/City.js";
import { sendSMS } from "../services/smsService.js";
import { calculateFees } from "../utils/feeCalculator.js"; // Assure-toi que cette fonction est bien définie
import CashRegister from "../models/CashRegister.js";



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
  
        // ✅ Vérification des champs obligatoires
        if (!senderFirstName || !senderLastName || !senderPhone || !receiverName || !receiverPhone || !receiverCity || !amount) {
            console.error("❌ Erreur : Tous les champs sont requis.");
            return res.status(400).json({ msg: "Tous les champs sont requis." });
          }
          
          
  
        // ✅ Conversion et validation du montant
        amount = parseFloat(amount);
        if (isNaN(amount) || amount <= 0) {
            console.error("❌ Erreur : Montant invalide :", amount);
            return res.status(400).json({ msg: "Montant invalide. Veuillez entrer un nombre valide." });
        }
  
        // ✅ Vérification de l'existence de l'utilisateur initiateur
        const sender = await User.findOne({ phone: senderPhone });
        if (!sender) {
            console.error("❌ Erreur : Utilisateur initiateur introuvable.");
            return res.status(404).json({ msg: "Utilisateur initiateur introuvable." });
        }
  
        // ✅ Vérification si l'utilisateur a un compte virtuel et un solde valide
        if (!sender.virtualAccount || typeof sender.virtualAccount.balance !== "number") {
            console.error("❌ Erreur : Compte virtuel non configuré pour l'utilisateur.");
            return res.status(400).json({ msg: "Compte virtuel non configuré." });
        }
  
        console.log(`✅ Solde initial de ${sender.name} : ${sender.virtualAccount.balance} XOF`);
  
        // ✅ Vérifier si les villes existent
       
        const receiverCityExists = await City.findById(receiverCity);
        if (!receiverCityExists) {
            console.error("❌ Erreur : Ville de retrait introuvable.");
            return res.status(400).json({ msg: "Ville de retrait invalide." });
        }
  
        // ✅ Calcul des frais (commission et taxe)
        const { commission, tax } = calculateFees(amount);
        let finalAmount = amount;
        let totalCost = amount + commission + tax;
  
        if (deductFeesFromAmount) {
            finalAmount = amount - commission - tax;
            totalCost = amount;
        }
  
        if (finalAmount <= 0) {
            console.error("❌ Erreur : Le montant après déduction des frais est invalide.");
            return res.status(400).json({ msg: "Le montant après déduction des frais est invalide." });
        }
  
        console.log(`✅ [FEE CALCULATOR] Montant: ${amount} | Commission: ${commission} | Taxe: ${tax}`);
        console.log(`💰 Final Amount: ${finalAmount} | Total Cost: ${totalCost}`);
  
        // ✅ Vérifier si l'utilisateur a assez de fonds
        if (sender.virtualAccount.balance < totalCost) {
            console.error("❌ Erreur : Fonds insuffisants. Solde actuel :", sender.virtualAccount.balance);
            return res.status(400).json({ msg: "Fonds insuffisants dans le compte virtuel." });
        }
  
        // ✅ Débiter le compte virtuel de l'initiateur
        sender.virtualAccount.balance -= totalCost;
        await sender.save();
        console.log(`✅ Nouveau solde de ${sender.name} : ${sender.virtualAccount.balance} XOF`);
  
        // ✅ Mise à jour de la caisse de la ville d'envoi
        // // Récupérer la caisse associée à la ville d'envoi (via un superviseur dont le champ city correspond à senderCity)
        // const senderCashRegister = await CashRegister.findOne({ status: "open" }).populate("supervisor");
        // if (!senderCashRegister || senderCashRegister.supervisor.city.toString() !== senderCity) {
        //     console.error("❌ Erreur : Aucune caisse ouverte trouvée pour la ville d'envoi.");
        //     return res.status(400).json({ msg: "Aucune caisse ouverte pour la ville d'envoi." });
        // }
        // // Créditer la caisse du montant total encaissé (transfert + commission + taxe)
        // senderCashRegister.currentBalance += totalCost;
        // senderCashRegister.transactions.push({
        //     type: "deposit",
        //     amount: totalCost,
        //     performedBy: sender._id, // Vous pouvez aussi utiliser req.user._id si c'est l'utilisateur connecté
        //     date: new Date(),
        //     note: "Transfert interville - crédit de la caisse d'envoi"
        // });
        // await senderCashRegister.save();
        // console.log("✅ Nouvelle balance de la caisse d'envoi :", senderCashRegister.currentBalance);
  
        // ✅ Génération du code secret unique
        const secretCode = await generateSecretCode();
        console.log(`🔑 Code Secret Généré: ${secretCode}`);
  
        // ✅ Création du transfert en base de données
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
            status: "pending"
        });
  
        await newTransfer.save();
        console.log("✅ Transfert enregistré en base de données avec succès.");
  
        // ✅ Envoi des notifications SMS (optionnel)
        await sendSMS(senderPhone, `Votre transfert interville est validé.\nMontant: ${finalAmount} XOF\nCode Secret: ${secretCode}.`);
        await sendSMS(receiverPhone, `Vous avez reçu un transfert interville.\nMontant: ${finalAmount} XOF\nCode Secret: ${secretCode}.`);
        console.log("📩 SMS envoyés aux parties concernées.");
  
        // ✅ Réponse avec le nouveau solde et le code secret
        res.status(201).json({
            msg: "Transfert effectué avec succès.",
            secretCode,
            totalCost,
            newBalance: sender.virtualAccount.balance // Retour du nouveau solde du compte virtuel
        });
  
    } catch (error) {
        console.error("❌ Erreur lors du transfert interville :", error.message, error.stack);
        res.status(500).json({ msg: "Erreur du serveur." });
    }
  };
  




  // Contrôleur : getUserInterCityTransfers
// export const getUserInterCityTransfers = async (req, res) => {
//     try {
//       const transfers = await InterCityTransfer.find({
//         senderPhone: req.user.phone // ou sender: req.user._id si tu stockes l'ID
//       })
//         .sort({ createdAt: -1 })
//         .populate("receiverCity", "name");
  
//       res.status(200).json(transfers);
//     } catch (error) {
//       console.error("❌ Erreur :", error);
//       res.status(500).json({ msg: "Erreur lors de la récupération des transferts." });
//     }
//   };
  

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
  