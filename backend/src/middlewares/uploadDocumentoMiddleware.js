const multer = require("multer");

const extensionesPermitidas = /\.(pdf|jpg|jpeg|png|doc|docx)$/i;

const fileFilter = (req, file, cb) => {
  if (extensionesPermitidas.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Formato no permitido (solo PDF, JPG, PNG, DOC o DOCX)"));
  }
};

const uploadDocumento = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB por archivo
});

module.exports = uploadDocumento;
