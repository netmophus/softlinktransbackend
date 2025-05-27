// // firebase/firebaseAdmin.js
// import admin from "firebase-admin";
// import { readFileSync } from "fs";

// const serviceAccount = JSON.parse(
//   readFileSync("./firebase/firebaseServiceAccount.json", "utf-8")
// );

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// export default admin.firestore();






import admin from "firebase-admin";

// 🔐 Lire la variable d’environnement Heroku (elle est une string JSON)
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

// ✅ Initialiser Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ✅ Export par défaut pour éviter l’erreur d'import
export default admin;

// ✅ Export facultatif pour réutiliser la base
export { db };

