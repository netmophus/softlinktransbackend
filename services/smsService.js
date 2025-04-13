// import axios from "axios";
// import dotenv from "dotenv";

// dotenv.config();

// const SMS_API_URL = process.env.SMS_API_URL;
// const SMS_USERNAME = process.env.SMS_USERNAME;
// const SMS_PASSWORD = process.env.SMS_PASSWORD;

// // Fonction pour envoyer un SMS
// export const sendSMS = async (to, message) => {
//     try {
//         const payload = {
//             to: to,
//             from: "Softlink",
//             content: message,
//             dlr: "yes",
//             "dlr-level": 3,
//             "dlr-method": "GET",
//             "dlr-url": "https://sms.ne/dlr"
//         };

//         const response = await axios.post(SMS_API_URL, payload, {
//             auth: {
//                 username: SMS_USERNAME,
//                 password: SMS_PASSWORD
//             },
//             headers: {
//                 "Content-Type": "application/json"
//             }
//         });

//         console.log("✅ SMS envoyé avec succès :", response.data);
//         return response.data;
//     } catch (error) {
//         if (error.response) {
//             console.error("❌ Erreur de l'API SMS :", error.response.data);
//         } else {
//             console.error("❌ Erreur lors de l'envoi du SMS :", error.message);
//         }
//         throw error;
//     }
// };



import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const SMS_API_URL = process.env.SMS_API_URL;
const SMS_USERNAME = process.env.SMS_USERNAME;
const SMS_PASSWORD = process.env.SMS_PASSWORD;

// Fonction pour envoyer un SMS
export const sendSMS = async (to, message) => {
    try {
        const payload = {
            to: to,
            from: "Softlink",
            content: message,
            dlr: "yes",
            "dlr-level": 3,
            "dlr-method": "GET",
            "dlr-url": "https://sms.ne/dlr"
        };

        const response = await axios.post(SMS_API_URL, payload, {
            auth: {
                username: SMS_USERNAME,
                password: SMS_PASSWORD
            },
            headers: {
                "Content-Type": "application/json"
            }
        });

        console.log("✅ SMS envoyé avec succès :", response.data);
        // Ici, on vérifie le statut HTTP et on retourne un objet structuré
        if (response.status === 200) {
          return { success: true, data: response.data };
        } else {
          return { success: false, data: response.data };
        }
    } catch (error) {
        if (error.response) {
            console.error("❌ Erreur de l'API SMS :", error.response.data);
        } else {
            console.error("❌ Erreur lors de l'envoi du SMS :", error.message);
        }
        return { success: false };
    }
};
