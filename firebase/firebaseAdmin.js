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

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin.firestore();
