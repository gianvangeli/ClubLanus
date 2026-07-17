const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Sube en la misma request los videos del día ("videos") y, opcionalmente,
// la imagen del dibujo táctico de la sesión ("dibujo"). Cada campo va a su
// propia carpeta según el tipo de archivo.
const uploadDirVideos = path.join(__dirname, "..", "..", "uploads", "videos");
const uploadDirImagenes = path.join(__dirname, "..", "..", "uploads", "imagenes");
fs.mkdirSync(uploadDirVideos, { recursive: true });
fs.mkdirSync(uploadDirImagenes, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === "dibujo" ? uploadDirImagenes : uploadDirVideos);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nombreUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nombreUnico);
  },
});

const extensionesVideo = /\.(mp4|mov|avi|mkv|webm|wmv|flv|m4v)$/i;
const extensionesImagen = /\.(jpg|jpeg|png|webp|gif)$/i;

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "dibujo") {
    if (extensionesImagen.test(file.originalname) && file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("El dibujo tiene que ser una imagen (jpg, png, webp, gif)"));
  }

  if (extensionesVideo.test(file.originalname) && file.mimetype.startsWith("video/")) {
    return cb(null, true);
  }
  return cb(new Error("Solo se permiten archivos de video (mp4, mov, avi, mkv, webm, wmv, flv, m4v)"));
};

const uploadEntrenamiento = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB por archivo
});

module.exports = uploadEntrenamiento;
