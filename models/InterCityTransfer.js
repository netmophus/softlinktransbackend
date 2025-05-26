import mongoose from "mongoose";

const InterCityTransferSchema = new mongoose.Schema({
  cashRegister: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CashRegister",
    required: false,
  },
  
    senderFirstName: { type: String, required: true }, // 🔹 Prénom de l'expéditeur
    senderLastName: { type: String, required: true }, // 🔹 Nom de l'expéditeur
    senderPhone: { type: String, required: true }, // 🔹 Téléphone de l'expéditeur
    senderCity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "City",
        required: false, // 🚫 Devient optionnel
      },
      
    receiverName: { type: String, required: true }, // 🔹 Nom du bénéficiaire
    receiverPhone: { type: String, required: true }, // 🔹 Téléphone du bénéficiaire
    receiverCity: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true }, // 🔹 Ville de retrait
   
    
    amount: { type: Number, required: true }, // 🔹 Montant envoyé
    commission: { type: Number, required: true }, // 🔹 Commission prélevée sur le transfert
    tax: { type: Number, required: true }, // 🔹 Taxe applicable sur le transfert

    secretCode: { type: String, required: true }, // 🔹 Code de retrait
    status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" }, // 🔹 État du transfert
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // facultatif, tu peux le mettre à false si nécessaire
    },
    
    createdAt: { type: Date, default: Date.now },

//ce qu'on  a ajouté 


receiverCashRegister: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "CashRegister",
  required: false, // 🔹 Renseigné uniquement au moment du retrait, pour indiquer la caisse qui a réellement payé
},

deliveredAt: { 
  type: Date 
  // 🔹 Date et heure exactes à laquelle le bénéficiaire a retiré l’argent
},

isMobileTransfer: { 
  type: Boolean, 
  default: false 
  // 🔹 Indique si le transfert a été initié depuis l’application mobile par un utilisateur inscrit
  // true = transfert mobile, false = transfert effectué physiquement à une caisse
},

refunded: { 
  type: Boolean, 
  default: false 
  // 🔹 Utilisé pour signaler qu’un transfert a été annulé et remboursé à l’expéditeur
  // Utile pour la gestion des litiges et annulations
},


});

export default mongoose.model("InterCityTransfer", InterCityTransferSchema);
