const express = require("express");
const router = express.Router();

const {
  crearLesion,
  listarLesiones,
  obtenerLesion,
  actualizarLesion,
  eliminarLesion,
  agregarArchivosLesion,
  obtenerArchivoLesion,
  eliminarArchivoLesion,
} = require("../controllers/lesionesController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadDocumento = require("../middlewares/uploadDocumentoMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Seguimiento médico: exclusivo del cuerpo técnico, el jugador no tiene
// acceso a ninguna de estas rutas.
router.use(verificarToken, autorizarRoles(...CUERPO_TECNICO));

// Alta y listado de lesiones de un jugador
router.post("/jugador/:jugadorId", crearLesion);
router.get("/jugador/:jugadorId", listarLesiones);

// Una lesión puntual
router.get("/:id", obtenerLesion);
router.put("/:id", actualizarLesion);
router.delete("/:id", eliminarLesion);

// Archivos de una lesión (diagnóstico, resonancia, estudio, informe, otro)
router.post("/:id/archivos", uploadDocumento.array("archivos", 20), agregarArchivosLesion);
router.get("/:id/archivos/:archivoId", obtenerArchivoLesion);
router.delete("/:id/archivos/:archivoId", eliminarArchivoLesion);

module.exports = router;
