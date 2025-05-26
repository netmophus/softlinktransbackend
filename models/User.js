
/**
 * 🔹 Sécurité et protections implémentées dans le modèle `User`
 * =============================================================
 *
 * 1️⃣ **Mot de passe sécurisé** :
 *    - Hashé avec `bcryptjs` avant d’être stocké dans la base de données.
 *    - Protection contre les attaques de type brute-force et rainbow table.
 *
 * 2️⃣ **PIN de sécurité pour les transactions** :
 *    - Utilisé pour protéger l’accès au compte virtuel et les transactions.
 *    - Stocké hashé avec `bcryptjs` pour éviter toute fuite en cas de violation de données.
 *    - Vérification via la méthode `verifyPIN()`.
 *
 * 3️⃣ **Authentification forte avec OTP (One-Time Password)** :
 *    - Code OTP envoyé par email/SMS pour valider les connexions et transactions sensibles.
 *    - Expiration après une durée définie (`otpExpiration`).
 *    - Protection contre les connexions frauduleuses.
 *
 * 4️⃣ **Protection contre les attaques par force brute** :
 *    - Compteur d’échecs (`failedLoginAttempts`) pour suivre les tentatives incorrectes.
 *    - Verrouillage automatique du compte (`isLocked`) après plusieurs tentatives infructueuses.
 *
 * 5️⃣ **Sécurité du compte et suivi d’activité** :
 *    - Champs `isActive` pour désactiver un compte si nécessaire.
 *    - Journalisation possible pour détecter des comportements suspects.
 *
 * 6️⃣ **Bonnes pratiques et extensibilité** :
 *    - Utilisation de `pre('save')` pour sécuriser le hashage du mot de passe et du PIN.
 *    - Possibilité d’ajouter des systèmes de récupération de compte (ex: question secrète, backup OTP).
 *    - Compatible avec une authentification 2FA (Two-Factor Authentication) pour encore plus de sécurité.
 *
 * ✅ Ces mesures garantissent un haut niveau de protection pour les comptes utilisateurs.
 */




// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";

// const UserSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, unique: true, sparse: true },
//   phone: { type: String, unique: true, required: true },
//   password: { type: String, required: true },
//   pin: { type: String, required: true }, // 🔹 PIN pour les transactions
//   role: { type: String, enum: ["user", "admin", "supervisor", "cashier"], required: true },
//   virtualAccount: {
//     balance: { type: Number, default: 0 },
//     currency: { type: String, default: "XOF" },
//   },
//   otp: { type: String }, // 🔹 Code OTP pour confirmation de connexion ou transaction
//   otpExpiration: { type: Date }, // 🔹 Expiration de l’OTP
//   failedLoginAttempts: { type: Number, default: 0 }, // 🔹 Nombre d’échecs de connexion
//   isLocked: { type: Boolean, default: false }, // 🔹 Compte verrouillé après trop d’échecs
//   isActive: { type: Boolean, default: true },
//   lastActivity: { type: Date, default: Date.now }, // ✅ Suivi de l'activité
//   createdAt: { type: Date, default: Date.now },
// });

// // 🔒 **Hashage du mot de passe et du PIN avant la sauvegarde**
// UserSchema.pre("save", async function (next) {
//   if (this.isModified("password")) {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//   }
//   if (this.isModified("pin")) {
//     const salt = await bcrypt.genSalt(10);
//     this.pin = await bcrypt.hash(this.pin, salt);
//   }
//   next();
// });

// // 🔍 **Méthode pour vérifier le PIN**
// UserSchema.methods.verifyPIN = async function (enteredPin) {
//   return await bcrypt.compare(enteredPin, this.pin);
// };

// export default mongoose.model("User", UserSchema);


import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  // pin: { type: String, required: true }, // 🔹 PIN pour les transactions
  // role: { 
  //   type: String, 
  //   enum: ["user", "admin", "supervisor", "cashier"], 
  //   required: true 
  // },

  pin: {
  type: String,
  required: function () {
    return this.role === "user" || this.role === "cashier";
  },
},


  role: {
  type: String,
  enum: ["user", "admin", "supervisor", "cashier", "agent"], // ✅ ajouté agent
  required: true,
},

  virtualAccount: {
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "XOF" },
  },
  otp: { type: String }, // 🔹 Code OTP pour confirmation de connexion ou transaction
  otpExpiration: { type: Date }, // 🔹 Expiration de l’OTP
  failedLoginAttempts: { type: Number, default: 0 }, // 🔹 Tentatives de connexion échouées
  isLocked: { type: Boolean, default: false }, // 🔹 Compte verrouillé après trop d’échecs
  isActive: { type: Boolean, default: true }, // 🔹 Pour désactiver un compte en cas de problème
  isActivated: { type: Boolean, default: true }, // 🔹 Pour gérer l’activation des caissiers
  isVerified: { type: Boolean, default: false }, // 🔹 Activé seulement après confirmation OTP

  // createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // 🔹 Qui a créé cet utilisateur ?
  lastActivity: { type: Date, default: Date.now }, // ✅ Suivi de l'activité
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  city: { type: mongoose.Schema.Types.ObjectId, ref: "City" }, // 🔹 Ville assignée au superviseur

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // 🔥 Ajouté ici
  createdAt: { type: Date, default: Date.now },
});

// 🔒 **Hashage du mot de passe et du PIN avant la sauvegarde**
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified("pin")) {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
  }
  next();
});

// 🔍 **Méthode pour vérifier le PIN**
UserSchema.methods.verifyPIN = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.pin);
};





// 🔍 **Méthode pour vérifier le mot de passe**
UserSchema.methods.verifyPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🔍 **Méthode pour vérifier si le compte est verrouillé ou désactivé**
UserSchema.methods.isAccountLockedOrInactive = function () {
  return this.isLocked || !this.isActive;
};

export default mongoose.model("User", UserSchema);
