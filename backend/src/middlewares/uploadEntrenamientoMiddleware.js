const multer = require("multer");
const os = require("os");
const path = require("path");
const fs = require("fs");

const extensionesVideo = /\.(mp4|mov|avi|mkv|webm|wmv|flv|m4v)$/i;

const fileFilter = (req, file, cb) => {
  if (extensionesVideo.test(file.originalname) && file.mimetype.startsWith("video/")) {
    return cb(null, true);
  }
  return cb(new Error("Solo se permiten archivos de video (mp4, mov, avi, mkv, webm, wmv, flv, m4v)"));
};

// Se escribe en disco temporal en vez de acumular el archivo entero en RAM
// (memoryStorage colgaba el proceso en Render con videos grandes).
const tmpDir = path.join(os.tmpdir(), "lanus-uploads");
fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});

const uploadEntrenamiento = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB por archivo
});

module.exports = uploadEntrenamiento;
