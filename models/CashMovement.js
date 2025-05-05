import mongoose from "mongoose";

const CashMovementSchema = new mongoose.Schema({
  // cashRegister: { type: mongoose.Schema.Types.ObjectId, ref: "CashRegister", required: true },
  cashRegister: { type: mongoose.Schema.Types.ObjectId, ref: "CashRegister", required: false },

  type: { type: String, enum: ["deposit", "withdrawal", "adjustment"], required: true },
  amount: { type: Number, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, default: Date.now },
  note: { type: String, default: "" },
  // Infos client pour interville ou autre
  clientFirstName: { type: String },
  clientLastName: { type: String },
  clientPhone: { type: String },


  operationType: { 
    type: String, 
    enum: [
      "guichet",
      "intercity_send",
      "intercity_receive",
      "intercity_cancel",      // 🔴 pour l'annulation
      "intercity_citychange",  // 🟠 pour le changement de ville
      "intercity_auto_refund"  // 🔵 pour le reverse "me renvoyer à moi-même"
    ], 
    default: "guichet" 
  },

  reference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InterCityTransfer",
  }
  
  

  // source: {
  //   type: String,
  //   enum: ["cashier", "supervisor"],
  //   default: "cashier"
  // }




});

export default mongoose.model("CashMovement", CashMovementSchema);
