import mongoose from "mongoose";

const UserTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔹 Utilisateur concerné
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔹 Caissier qui a effectué l’opération
  cashRegister: { type: mongoose.Schema.Types.ObjectId, ref: "CashRegister", required: true }, // 🔹 Caisse associée
  type: { type: String, enum: ["deposit", "withdrawal"], required: true }, // 🔹 Type d'opération (Dépôt ou Retrait)
  amount: { type: Number, required: true }, // 🔹 Montant de la transaction
  netAmount: { type: Number, required: true }, // 🔹 Montant après commission et taxe
  commissionAmount: { type: Number, default: 0 }, // 🔹 Commission prélevée
  taxAmount: { type: Number, default: 0 }, // 🔹 Taxe appliquée sur la commission
  applyCommission: { type: Boolean, default: true }, // 🔹 Indique si une commission/taxe a été appliquée
  date: { type: Date, default: Date.now }, // 🔹 Date de l'opération
});

export default mongoose.model("UserTransaction", UserTransactionSchema);
