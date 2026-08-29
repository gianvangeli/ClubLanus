const express = require("express");
const router = express.Router();

const {
  listarJugadas,
  crearJugada,
  obtenerJugada,
  eliminarJugada,
} = require("../controllers/pizarraJugadasController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Biblioteca de jugadas guardadas: exclusiva del cuerpo técnico, igual que
// el resto de la pizarra táctica.
router.use(verificarToken, autorizarRoles(...CUERPO_TECNICO));

router.get("/", listarJugadas);
router.get("/:id", obtenerJugada);
router.post("/", crearJugada);
router.delete("/:id", eliminarJugada);

module.exports = router;
