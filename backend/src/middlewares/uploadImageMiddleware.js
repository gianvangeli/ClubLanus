const multer = require("multer");

const extensionesPermitidas = /\.(jpg|jpeg|png|webp|gif)$/i;

const fileFilter = (req, file, cb) => {
  const extensionValida = extensionesPermitidas.test(file.originalname);
  const mimeValido = file.mimetype.startsWith("image/");

  if (extensionValida && mimeValido) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes (jpg, png, webp, gif)"));
  }
};

const uploadImage = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

module.exports = uploadImage;
