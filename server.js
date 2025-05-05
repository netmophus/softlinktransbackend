
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import supervisorRoutes from "./routes/supervisorRoutes.js";
import cashRegisterRoutes from "./routes/cashRegisterRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import cashierRoutes from "./routes/cashierRoutes.js"; 
import userTransactionRoutes from "./routes/userTransactionRoutes.js"; // ✅ Import des routes de transfert entre utilisateurs
import tontineRoutes from "./routes/tontineRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import interUserTransferRoutes from "./routes/interUserTranferRoutes.js";
import  identificationRoutes from "./routes/identificationRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import commissionsRoutes from "./routes/commissionsRoutes.js";
import feesRoutes from "./routes/feesRoutes.js";
dotenv.config();

const app = express();

// ✅ Configuration de CORS (Mise à jour)
// const corsOptions = {
//   origin: "http://localhost:3000", // Remplace par l'URL de ton frontend en production
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"], // ✅ Ajout de `Authorization` pour les tokens
// };

const corsOptions = {
  origin: [
    "http://localhost:3000", // Pour développement local    
    "https://softlinktransfrontend-b028bd70ad96.herokuapp.com" // Pour production Heroku
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Si tu utilises des cookies ou tokens avec credentials
};


app.use(cors(corsOptions));

// ✅ Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Connexion MongoDB (Correction : suppression des options obsolètes)

// ✅ Vérifie la valeur de la variable d'environnement
console.log("MONGO_URI utilisé :", process.env.MONGO_URI);


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connexion MongoDB réussie"))
  .catch((err) => console.error("❌ Erreur de connexion MongoDB :", err));

  

// ✅ Routes
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/supervisor", supervisorRoutes);
app.use("/supervisor/cash-registers", cashRegisterRoutes);
app.use("/cashier", cashierRoutes);
app.use("/admin/cities", cityRoutes);
app.use("/user", userRoutes); // 🔹 Routes spécifiques aux utilisateurs
app.use("/fees", feesRoutes);

// 🔹 Ajout des routes pour les transferts entre utilisateurs
app.use("/user-transactions", userTransactionRoutes);

// ✅ Ajoute cette ligne dans server.js pour utiliser les routes
app.use("/api/tontines", tontineRoutes);


// Montage des routes avec le préfixe /ntrausertranfer
app.use("/intrausertranfer", interUserTransferRoutes);



app.use("/api/identifications", identificationRoutes);


app.use("/config", configRoutes); // /config/fees

app.use("/admin/commissions", commissionsRoutes);

app.get("/", (req, res) => {
  res.send("Bienvenue sur l’API NIYYA !");
});

// ✅ Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
