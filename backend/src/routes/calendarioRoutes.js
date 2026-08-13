const express = require("express");
const router = express.Router();

const {
  crearMicrociclo,
  listarMicrociclos,
  obtenerMicrociclo,
  eliminarMicrociclo,
  crearBloque,
  actualizarBloque,
  eliminarBloque,
  listarMicrociclosJugador,
  obtenerMicrocicloJugador,
} = require("../controllers/calendarioController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Vista de solo lectura para el jugador (registrada antes del router.use de
// abajo, que restringe todo lo demás al cuerpo técnico). Solo trae los
// campos "públicos" de cada bloque, nunca los de trabajo interno.
router.get("/jugador", verificarToken, autorizarRoles("jugador"), listarMicrociclosJugador);
router.get("/jugador/:id", verificarToken, autorizarRoles("jugador"), obtenerMicrocicloJugador);

// Planificación semanal: el resto es exclusivo del cuerpo técnico.
router.use(verificarToken, autorizarRoles(...CUERPO_TECNICO));

router.post("/", crearMicrociclo);
router.get("/", listarMicrociclos);
router.get("/:id", obtenerMicrociclo);
router.delete("/:id", eliminarMicrociclo);

router.post("/:microcicloId/bloques", crearBloque);
router.put("/bloques/:bloqueId", actualizarBloque);
router.delete("/bloques/:bloqueId", eliminarBloque);

module.exports = router;
