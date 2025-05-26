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
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./firebase/firebaseServiceAccount.json", "utf-8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = getFirestore();
export default db;
