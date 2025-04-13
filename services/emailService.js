import nodemailer from "nodemailer";

const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.mailtrap.io";
const EMAIL_PORT = process.env.EMAIL_PORT || 2525;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

/**
 * Envoie un email
 * @param {string} to - Adresse email du destinataire
 * @param {string} subject - Sujet de l’email
 * @param {string} text - Contenu en texte brut
 */
export const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Niyya Transfert" <noreply@niyya.com>`,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé à ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de l'email :`, error.message);
    return false;
  }
};
