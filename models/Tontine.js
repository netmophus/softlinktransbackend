
import mongoose from "mongoose";

const TontineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  contributionAmount: { type: Number, required: true },
  totalCycles: { type: Number, required: true },
  currentCycle: { type: Number, default: 1 },
  startDate: { type: Date, required: true },
  frequency: { type: String, enum: ["weekly", "monthly"], required: true },
  status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },

  // ✅ Liste des membres (max 10)
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      joinedAt: { type: Date, default: Date.now },
    },
  ],

  // ✅ Liste des bénéficiaires (ceux qui ont déjà reçu leur paiement)
  beneficiaries: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // ✅ Compte virtuel pour stocker les contributions avant le transfert
  virtualAccount: {
    balance: { type: Number, default: 0 }, // Argent collecté en attente de versement
    currency: { type: String, default: "XOF" },
  },

  createdAt: { type: Date, default: Date.now },
});

// ✅ Limitation automatique à 10 membres
TontineSchema.pre("save", function (next) {
  if (this.members.length > 10) {
    return next(new Error("Le nombre de membres ne peut pas dépasser 10."));
  }
  next();
});

export default mongoose.model("Tontine", TontineSchema);
