const express = require("express");
const router = express.Router();

const { listarNotificaciones, marcarLeida, marcarTodasLeidas } = require("../controllers/notificacionesController");
const { verificarToken } = require("../middlewares/authMiddleware");

// Cualquier rol logueado tiene sus propias notificaciones.
router.get("/", verificarToken, listarNotificaciones);
router.put("/marcar-todas-leidas", verificarToken, marcarTodasLeidas);
router.put("/:id/leida", verificarToken, marcarLeida);

module.exports = router;
