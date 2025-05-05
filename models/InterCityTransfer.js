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
});

export default mongoose.model("InterCityTransfer", InterCityTransferSchema);
