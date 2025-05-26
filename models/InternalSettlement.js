import mongoose from "mongoose";

const InternalSettlementSchema = new mongoose.Schema({
  fromCashRegister: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CashRegister",
    required: false, // 🔹 null si le transfert vient d’un utilisateur mobile
  },

  toCashRegister: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CashRegister",
    required: true, // 🔹 caisse qui a réellement payé le bénéficiaire
  },

  interCityTransfer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InterCityTransfer",
    required: true, // 🔹 référence du transfert concerné
  },

  amount: {
    type: Number,
    required: true, // 🔹 montant à compenser
  },

  settled: {
    type: Boolean,
    default: false, // 🔹 true lorsque la compensation a été validée
  },

  settledAt: {
    type: Date, // 🔹 date à laquelle le règlement a été effectué
  },

  settledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // 🔹 utilisateur (admin ou superviseur) ayant validé la compensation
  }
}, { timestamps: true });

export default mongoose.model("InternalSettlement", InternalSettlementSchema);
