const multer = require("multer");
const os = require("os");
const path = require("path");
const fs = require("fs");

const extensionesImagen = /\.(jpg|jpeg|png|webp)$/i;
const extensionesVideo = /\.(mp4|mov|avi|mkv|webm|wmv|flv|m4v)$/i;

// La pizarra táctica de un ejercicio se puede dibujar (CanchaEditor) o, como
// alternativa, subir como imagen o video ya listos (por ejemplo una foto de
// un pizarrón físico o una animación exportada). Este middleware valida
// distinto según el campo: "video" (el video real del ejercicio) solo
// acepta video, "pizarra_archivo" acepta imagen o video.
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "pizarra_archivo") {
    if (extensionesImagen.test(file.originalname) || extensionesVideo.test(file.originalname)) {
      return cb(null, true);
    }
    return cb(new Error("La pizarra solo admite imagen (jpg, png, webp) o video (mp4, mov, avi, mkv, webm, wmv, flv, m4v)"));
  }

  if (extensionesVideo.test(file.originalname) && file.mimetype.startsWith("video/")) {
    return cb(null, true);
  }
  return cb(new Error("Solo se permiten archivos de video (mp4, mov, avi, mkv, webm, wmv, flv, m4v)"));
};

// Igual que el resto de los middlewares de upload: se escribe en disco
// temporal en vez de acumular el archivo entero en RAM.
const tmpDir = path.join(os.tmpdir(), "lanus-uploads");
fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});

const uploadPizarra = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB por archivo
});

const tipoDeArchivoPizarra = (mimetype) => (mimetype.startsWith("image/") ? "imagen" : "video");

module.exports = uploadPizarra;
module.exports.tipoDeArchivoPizarra = tipoDeArchivoPizarra;
