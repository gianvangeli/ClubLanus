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
} = require("../controllers/calendarioController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Planificación semanal: exclusiva del cuerpo técnico.
router.use(verificarToken, autorizarRoles(...CUERPO_TECNICO));

router.post("/", crearMicrociclo);
router.get("/", listarMicrociclos);
router.get("/:id", obtenerMicrociclo);
router.delete("/:id", eliminarMicrociclo);

router.post("/:microcicloId/bloques", crearBloque);
router.put("/bloques/:bloqueId", actualizarBloque);
router.delete("/bloques/:bloqueId", eliminarBloque);

module.exports = router;
