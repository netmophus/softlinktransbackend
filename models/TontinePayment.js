// import mongoose from "mongoose";

// const TontinePaymentSchema = new mongoose.Schema({
//   tontine: { type: mongoose.Schema.Types.ObjectId, ref: "Tontine", required: true },
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

//   payments: [
//     {
//       cycleNumber: Number,
//       dueDate: Date,
//       hasPaid: { type: Boolean, default: false },
//       paymentDate: { type: Date, default: null },
//     },
//   ],

//   createdAt: { type: Date, default: Date.now },
// });

// export default mongoose.model("TontinePayment", TontinePaymentSchema);





// import mongoose from "mongoose";

// const TontinePaymentSchema = new mongoose.Schema({
//   tontine: { type: mongoose.Schema.Types.ObjectId, ref: "Tontine", required: true }, // 🔗 Référence à la tontine
//   cycle: { type: mongoose.Schema.Types.ObjectId, ref: "TontineCycle", required: true }, // 🔗 Cycle associé au paiement
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔗 Membre qui paie
//   amountPaid: { type: Number, required: true }, // 💰 Montant payé
//   hasPaid: { type: Boolean, default: false }, // ✅ Indique si le paiement est effectué
//   paymentDate: { type: Date, default: null }, // 📅 Date du paiement
//   createdAt: { type: Date, default: Date.now }, // 🕒 Date d'enregistrement du paiement
// });

// export default mongoose.model("TontinePayment", TontinePaymentSchema);




import mongoose from "mongoose";

const TontinePaymentSchema = new mongoose.Schema({
  tontine: { type: mongoose.Schema.Types.ObjectId, ref: "Tontine", required: true }, // 🔗 Référence à la tontine
  cycle: { type: mongoose.Schema.Types.ObjectId, ref: "TontineCycle", required: true }, // 🔗 Cycle associé au paiement
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔗 Membre qui paie

  amountPaid: { type: Number, required: true }, // 💰 Montant payé
  hasPaid: { type: Boolean, default: false }, // ✅ Paiement effectué ou non
  paymentDate: { type: Date, default: null }, // 📅 Date du paiement

  // ✅ Ajout : Frais de gestion prélevés sur le paiement
  managementFee: { type: Number, default: 0 }, // 💰 2% du montant payé
  taxAmount: { type: Number, default: 0 }, // 💰 TVA de 19% appliquée sur les frais

  // ✅ Ajout : Mode de paiement (compte virtuel, cash, mobile money, etc.)
  paymentMethod: { 
    type: String, 
    enum: ["compte_virtuel", "cash", "mobile_money"], 
    required: true 
  }, 

  // ✅ Ajout : Références pour suivre les transactions
  fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // 🔗 Compte virtuel de l’utilisateur
  tontineAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Tontine" }, // 🔗 Compte virtuel de la tontine

  createdAt: { type: Date, default: Date.now }, // 🕒 Date d'enregistrement du paiement
});

export default mongoose.model("TontinePayment", TontinePaymentSchema);
