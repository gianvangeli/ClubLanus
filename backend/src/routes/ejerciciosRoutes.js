const express = require("express");
const router = express.Router();

const {
  crearEjercicio,
  listarEjercicios,
  obtenerEjercicio,
  actualizarEjercicio,
  eliminarEjercicio,
} = require("../controllers/ejerciciosController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Material de planificación: exclusivo del cuerpo técnico, el jugador no
// tiene acceso a ninguna de estas rutas.
router.use(verificarToken, autorizarRoles(...CUERPO_TECNICO));

router.post("/entrenamiento/:entrenamientoId", crearEjercicio);
router.get("/entrenamiento/:entrenamientoId", listarEjercicios);
router.get("/:id", obtenerEjercicio);
router.put("/:id", actualizarEjercicio);
router.delete("/:id", eliminarEjercicio);

module.exports = router;
