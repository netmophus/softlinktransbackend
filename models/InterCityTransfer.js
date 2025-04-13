import mongoose from "mongoose";

const InterCityTransferSchema = new mongoose.Schema({
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // car toujours initié par quelqu’un
    },
    
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // toujours un caissier
      default: null, // mis à jour lors du paiement
    },
    
    
    amount: { type: Number, required: true }, // 🔹 Montant envoyé
    commission: { type: Number, required: true }, // 🔹 Commission prélevée sur le transfert
    tax: { type: Number, required: true }, // 🔹 Taxe applicable sur le transfert

    secretCode: { type: String, required: true }, // 🔹 Code de retrait
    status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" }, // 🔹 État du transfert

    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("InterCityTransfer", InterCityTransferSchema);
