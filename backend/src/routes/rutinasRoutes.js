const express = require("express");
const router = express.Router();

const {
  crearRutina,
  listarRutinasStaff,
  obtenerRutinaStaff,
  eliminarRutina,
  listarRutinasJugador,
  obtenerRutinaJugador,
  actualizarCompletado,
  obtenerArchivoVideo,
} = require("../controllers/rutinasController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadVideo = require("../middlewares/uploadMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Alta de una rutina (general o individual), con video opcional
router.post(
  "/",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadVideo.array("video", 1),
  crearRutina
);

// Listado + detalle para el cuerpo técnico (con avance de cumplimiento)
router.get("/admin", verificarToken, autorizarRoles(...CUERPO_TECNICO), listarRutinasStaff);
router.get("/admin/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), obtenerRutinaStaff);
router.delete("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), eliminarRutina);

// Listado + detalle para el jugador (solo las que le corresponden)
router.get("/", verificarToken, autorizarRoles("jugador"), listarRutinasJugador);
router.get("/:id", verificarToken, autorizarRoles("jugador"), obtenerRutinaJugador);

// El jugador marca (o desmarca) el cumplimiento
router.put("/:id/completado", verificarToken, autorizarRoles("jugador"), actualizarCompletado);

// Archivo de video de la rutina
router.get("/videos/:videoId/archivo", verificarToken, obtenerArchivoVideo);

module.exports = router;
