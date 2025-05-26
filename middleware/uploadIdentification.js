import multer from "multer";

const storage = multer.memoryStorage(); // Utilisé avec Cloudinary ou autre service cloud

const uploadIdentification = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5 Mo par fichier
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont autorisées."), false);
    }
  },
});

export default uploadIdentification;
