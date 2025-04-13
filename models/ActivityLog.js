import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, // Exemple : "Transaction", "Login", "Password Change"
  details: { type: String }, // Détails supplémentaires de l'action (Ex: montant, destinataire, etc.)
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("ActivityLog", ActivityLogSchema);
