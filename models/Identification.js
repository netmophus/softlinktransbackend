import mongoose from "mongoose";

const identificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // Un seul dossier par utilisateur
  },
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ["Homme", "Femme"], required: true },
  country: { type: String, required: true },
  city: { type: String },
  address: { type: String },
  profession: { type: String },

  idType: { type: String, required: true },      // Exemple : CNI, Passeport
  idNumber: { type: String, required: true },

  idFrontImage: { type: String, required: true }, // URL Cloudinary
  idBackImage: { type: String },                  // Facultatif
  selfieWithId: { type: String, required: true },

  status: {
    type: String,
    enum: ["en attente", "validé", "rejeté"],
    default: "en attente",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Identification = mongoose.model("Identification", identificationSchema);
export default Identification;
