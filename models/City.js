import mongoose from "mongoose";

const CitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // 🔹 Nom unique de la ville
  region: { type: String, required: true }, // 🔹 Région (optionnel, pour structurer)
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("City", CitySchema);
