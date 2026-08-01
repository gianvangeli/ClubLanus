const express = require("express");
const router = express.Router();

const {
  listarMisJugadores,
  obtenerJugadorAsignado,
  crearInforme,
  listarInformes,
  actualizarSemaforo,
} = require("../controllers/informesPsicologicosController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");

// Exclusivo del psicólogo: ningún otro rol (cuerpo técnico, dirigencia,
// jugador) puede entrar a ninguna de estas rutas.
router.use(verificarToken, autorizarRoles("psicologo"));

router.get("/mis-jugadores", listarMisJugadores);
router.get("/jugador/:jugadorId", obtenerJugadorAsignado);
router.post("/jugador/:jugadorId/informes", crearInforme);
router.get("/jugador/:jugadorId/informes", listarInformes);
router.put("/jugador/:jugadorId/semaforo", actualizarSemaforo);

module.exports = router;
