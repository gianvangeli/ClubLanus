const express = require("express");
const router = express.Router();

const { listarResumenGeneral } = require("../controllers/generalController");
const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Resumen general del plantel: estado por área de cada jugador, tomando
// lo que ya se carga en Jugadores. Exclusivo de cuerpo técnico/admin.
router.get("/", verificarToken, autorizarRoles(...CUERPO_TECNICO), listarResumenGeneral);

module.exports = router;
