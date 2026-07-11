const express = require("express");
const router = express.Router();

const {
  crearEntrenamiento,
  listarEntrenamientos,
  obtenerEntrenamiento,
  eliminarVideoEntrenamiento,
  eliminarEntrenamiento,
  obtenerArchivoVideo,
} = require("../controllers/entrenamientosController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadVideo = require("../middlewares/uploadMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Agenda de entrenamientos: visible para todo el plantel
router.get("/", verificarToken, listarEntrenamientos);

// Detalle de una sesión con sus videos: visible para todo el plantel
router.get("/:id", verificarToken, obtenerEntrenamiento);

// Alta rápida: crea (o reutiliza) la sesión del día y sube los videos
router.post(
  "/",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadVideo.array("videos", 10),
  crearEntrenamiento
);

// Elimina la sesión completa
router.delete("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), eliminarEntrenamiento);

// Elimina un video puntual de una sesión
router.delete(
  "/videos/:videoId",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarVideoEntrenamiento
);

// Sirve el archivo de un video de entrenamiento
router.get("/videos/:videoId/archivo", verificarToken, obtenerArchivoVideo);

module.exports = router;
