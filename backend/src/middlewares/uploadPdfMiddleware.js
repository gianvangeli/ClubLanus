const multer = require("multer");

const fileFilter = (req, file, cb) => {
  const extensionValida = /\.pdf$/i.test(file.originalname);
  const mimeValido = file.mimetype === "application/pdf";

  if (extensionValida && mimeValido) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos PDF"));
  }
};

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB por archivo
});

module.exports = uploadPdf;
