const multer = require("multer");

// Sube en la misma request los videos del día ("videos") y, opcionalmente,
// la imagen del dibujo táctico de la sesión ("dibujo").
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
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB por archivo
});

module.exports = uploadEntrenamiento;
