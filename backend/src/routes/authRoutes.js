const express = require("express");
const router = express.Router();

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");

const { registrarStaff, login } = require("../controllers/authController");

// Alta de cuerpo técnico: solo admin
router.post(
  "/register-staff",
  verificarToken,
  autorizarRoles("admin"),
  registrarStaff
);

router.post("/login", login);

router.get("/perfil", verificarToken, (req, res) => {
  res.json({
    message: "Ruta protegida funcionando",
    usuario: req.usuario,
  });
});

router.get(
  "/solo-admin",
  verificarToken,
  autorizarRoles("admin"),
  (req, res) => {
    res.json({ message: "Bienvenido admin" });
  }
);

module.exports = router;
