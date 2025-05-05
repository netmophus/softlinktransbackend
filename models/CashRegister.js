

// import mongoose from "mongoose";

// const CashRegisterSchema = new mongoose.Schema({
//   registerNumber: { type: String, unique: true, required: true }, // 🔹 Identifiant unique de la caisse
//   cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔹 Caissier concerné
//   supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔹 Superviseur qui gère la caisse
//   initialBalance: { type: Number, required: true }, // 🔹 Solde initial du caissier
//   openingAmount: { type: Number, required: true }, // 🔹 Montant mis à disposition au début
//   closingAmount: { type: Number, default: 0 }, // 🔹 Montant final à la fermeture
//   currentBalance: { type: Number, required: true }, // 🔹 ✅ Solde actuel qui évolue selon les transactions
//   discrepancy: { type: Number, default: 0 }, // 🔹 Écart éventuel
//   justification: { type: String, default: "" }, // 🔹 Justification obligatoire si écart
//   status: { type: String, enum: ["open", "closed"], default: "open" }, // 🔹 Statut de la caisse
//   closingVerified: { type: Boolean, default: false }, // 🔹 Indique si la fermeture a été validée
//   reopened: { type: Boolean, default: false }, // 🔹 Indique si la caisse a été réouverte
//   reopenReason: { type: String, default: "" }, // 🔹 Justification en cas de réouverture
  
//   transactions: [
//     {
//       type: { type: String, enum: ["deposit", "withdrawal", "adjustment"], required: true }, // 🔹 Type d’opération
//       amount: { type: Number, required: true }, // 🔹 Montant de l’opération
//       performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔹 Qui a fait l'opération
//       date: { type: Date, default: Date.now },
//     },
//   ],
//   isActive: { type: Boolean, default: true },

//   openedAt: { type: Date, default: Date.now }, // 🔹 Date d’ouverture
//   closedAt: { type: Date }, // 🔹 Date de fermeture
// });

// export default mongoose.model("CashRegister", CashRegisterSchema);





import mongoose from "mongoose";

const CashRegisterSchema = new mongoose.Schema({
  registerNumber: { type: String, unique: true, required: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  initialBalance: { type: Number, required: true },
  openingAmount: { type: Number, required: true },
  closingAmount: { type: Number, default: 0 },
  currentBalance: { type: Number, required: true },
  discrepancy: { type: Number, default: 0 },
  justification: { type: String, default: "" },
  status: { type: String, enum: ["open", "closed"], default: "open" },
  closingVerified: { type: Boolean, default: false },
  reopened: { type: Boolean, default: false },
  reopenReason: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

export default mongoose.model("CashRegister", CashRegisterSchema);
