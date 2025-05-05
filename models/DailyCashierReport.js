import mongoose from "mongoose";

const DailyCashierReportSchema = new mongoose.Schema({
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  cashRegister: { type: mongoose.Schema.Types.ObjectId, ref: "CashRegister", required: true },
  date: { type: Date, required: true },

  openingAmount: { type: Number, required: true },
  closingAmount: { type: Number, required: true },

  totalDeposits: { type: Number, default: 0 },
  totalWithdrawals: { type: Number, default: 0 },
  totalInterCityTransfers: { type: Number, default: 0 },

  discrepancy: { type: Number, default: 0 },
  isClosed: { type: Boolean, default: false },
});

export default mongoose.model("DailyCashierReport", DailyCashierReportSchema);
