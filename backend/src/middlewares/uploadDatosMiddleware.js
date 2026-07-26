const multer = require("multer");

const extensionesPermitidas = /\.(csv|xlsx|xls|json|pdf)$/i;

const fileFilter = (req, file, cb) => {
  if (extensionesPermitidas.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Formato no permitido (solo CSV, XLSX, XLS, JSON o PDF)"));
  }
};

const uploadDatos = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB por archivo
});

module.exports = uploadDatos;
