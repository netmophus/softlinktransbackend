// // models/CommissionHistory.js
// import mongoose from "mongoose";

// const commissionHistorySchema = new mongoose.Schema({
//   type: { type: String, enum: ["tontine", "intercity", "interuser"], required: true },
//   referenceId: { type: mongoose.Schema.Types.ObjectId }, // id de la transaction, cycle, ou autre selon le type
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // celui qui paie la commission
//   city: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
//   amount: Number,          // montant brut
//   commission: Number,      // commission prélevée
//   tax: Number,             // taxe prélevée
//   netAmount: Number,       // montant net reçu par le bénéficiaire (si pertinent)
//   date: { type: Date, default: Date.now }
// });

// export default mongoose.model("CommissionHistory", commissionHistorySchema);


import mongoose from "mongoose";

const CommissionHistorySchema = new mongoose.Schema({
  transactionType: {
    type: String,
    required: true,
    enum: ["intercity", "interuser", "tontine", "transfer", "other"], // adapte selon les besoins
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Id du transfert d'origine si besoin (optionnel)
    refPath: "referenceModel",
  },
  referenceModel: {
    type: String,
    required: false, // "InterCityTransfer", "InterUserTransfer", "Tontine", etc.
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // L'utilisateur à qui est associée la commission
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    required: false,
  },
  amount: {
    type: Number,
    required: true, // Montant total de la transaction (avant déduction)
  },
  commission: {
    type: Number,
    required: true, // Montant de la commission prélevée
  },
  tax: {
    type: Number,
    required: true, // Montant de la taxe prélevée
  },
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Pour les tontines : le bénéficiaire
  },
  description: {
    type: String,
    required: false,
    default: "",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const CommissionHistory = mongoose.model("CommissionHistory", CommissionHistorySchema);

export default CommissionHistory;
