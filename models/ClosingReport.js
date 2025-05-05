import mongoose from "mongoose";

const ClosingReportSchema = new mongoose.Schema({
  cashRegister: { type: mongoose.Schema.Types.ObjectId, ref: "CashRegister", required: true },
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  registerNumber: { type: String }, // <--- Ajouté !
  openingAmount: { type: Number, required: true },
  totalDeposits: { type: Number, required: true },
  totalWithdrawals: { type: Number, required: true },
  expectedClosingAmount: { type: Number, required: true },
  actualClosingAmount: { type: Number, required: true },
  discrepancy: { type: Number, required: true },
  closedAt: { type: Date, default: Date.now },
});


export default mongoose.model("ClosingReport", ClosingReportSchema);
