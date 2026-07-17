const multer = require("multer");

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

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB por archivo
});

module.exports = uploadVideo;
