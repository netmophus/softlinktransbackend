import mongoose from "mongoose";

const TontineCommissionHistorySchema = new mongoose.Schema({
  tontine: { type: mongoose.Schema.Types.ObjectId, ref: "Tontine", required: true },
  cycle: { type: mongoose.Schema.Types.ObjectId, ref: "TontineCycle", required: true },
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Celui qui fait le versement
  montantTotal: { type: Number, required: true },
  fraisGestion: { type: Number, required: true },
  taxe: { type: Number, required: true },
  montantNet: { type: Number, required: true },
  servedAt: { type: Date, default: Date.now }
});

export default mongoose.model("TontineCommissionHistory", TontineCommissionHistorySchema);
