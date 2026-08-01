const multer = require("multer");
const os = require("os");
const path = require("path");
const fs = require("fs");

const extensionesPermitidas = /\.(mp4|mov|avi|mkv|webm|wmv|flv|m4v)$/i;

const fileFilter = (req, file, cb) => {
  const extensionValida = extensionesPermitidas.test(file.originalname);
  const mimeValido = file.mimetype.startsWith("video/");

  if (extensionValida && mimeValido) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos de video (mp4, mov, avi, mkv, webm, wmv, flv, m4v)"));
  }
};

// Los videos se escriben en disco a medida que llegan (en vez de
// acumularse enteros en un buffer en RAM con memoryStorage), porque un
// archivo de varios cientos de MB o GB en memoria colgaba el proceso en
// Render. El controller sube después ese archivo temporal en streaming
// (ver guardarArchivoDesdeRuta en config/storage.js).
const tmpDir = path.join(os.tmpdir(), "lanus-uploads");
fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});

const uploadVideo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB por archivo
});

module.exports = uploadVideo;
