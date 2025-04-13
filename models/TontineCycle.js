// import mongoose from "mongoose";

// const TontineCycleSchema = new mongoose.Schema({
//   tontine: { type: mongoose.Schema.Types.ObjectId, ref: "Tontine", required: true }, // 🔗 Référence à la tontine
//   cycleNumber: { type: Number, required: true }, // 🔢 Numéro du cycle
//   dueDate: { type: Date, required: true }, // 📅 Date limite du cycle
//   isCompleted: { type: Boolean, default: false }, // ✅ Indique si le cycle est terminé
//   createdAt: { type: Date, default: Date.now }, // 📌 Date de création du cycle
// });

// export default mongoose.model("TontineCycle", TontineCycleSchema);




import mongoose from "mongoose";

const TontineCycleSchema = new mongoose.Schema({
  tontine: { type: mongoose.Schema.Types.ObjectId, ref: "Tontine", required: true }, // 🔗 Référence à la tontine
  cycleNumber: { type: Number, required: true }, // 🔢 Numéro du cycle
  dueDate: { type: Date, required: true }, // 📅 Date limite du cycle
  isCompleted: { type: Boolean, default: false }, // ✅ Indique si le cycle est terminé

  // ✅ Ajout : Suivi des paiements liés au cycle
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: "TontinePayment" }], 

  // ✅ Ajout : État du cycle
  status: { 
    type: String, 
    enum: ["pending", "in_progress", "completed"], 
    default: "pending" 
  }, 

  // ✅ Ajout : Bénéficiaire du cycle
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 

  createdAt: { type: Date, default: Date.now }, // 📌 Date de création du cycle
});

export default mongoose.model("TontineCycle", TontineCycleSchema);
