import mongoose from "mongoose";

const InterUserTransferSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  senderPhone: { 
    type: String, 
    required: true 
  },
  receiverPhone: { 
    type: String, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  commission: { 
    type: Number, 
    default: 0 
  },
  tax: { 
    type: Number, 
    default: 0 
  },
  // netAmount correspond au montant que le bénéficiaire reçoit
  // si les frais sont déduits de l'envoi, sinon il peut être égal à "amount"
  netAmount: { 
    type: Number, 
    required: true 
  },
  applyCommission: { 
    type: Boolean, 
    default: true 
  },
  status: { 
    type: String, 
    enum: ["completed", "cancelled"],  // ❌ Supprime "pending"
    default: "completed"  // ✅ Définit "completed" par défaut
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: { 
    type: Date 
  }
});

export default mongoose.model("InterUserTransfer", InterUserTransferSchema);
