const express = require("express");
const router = express.Router();

const {
  crearEntrenamiento,
  actualizarEntrenamiento,
  listarEntrenamientos,
  obtenerEntrenamiento,
  eliminarVideoEntrenamiento,
  eliminarEntrenamiento,
  obtenerArchivoVideo,
  obtenerArchivoDibujo,
  obtenerReflexion,
  actualizarReflexion,
} = require("../controllers/entrenamientosController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadEntrenamiento = require("../middlewares/uploadEntrenamientoMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Agenda de entrenamientos: visible para todo el plantel
router.get("/", verificarToken, listarEntrenamientos);

// Detalle de una sesión con sus videos: visible para todo el plantel
router.get("/:id", verificarToken, obtenerEntrenamiento);

// Alta rápida: crea (o reutiliza) la sesión del día, sube los videos y
// guarda los datos de planificación (incluida la imagen del dibujo táctico)
router.post(
  "/",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadEntrenamiento.fields([
    { name: "videos", maxCount: 10 },
    { name: "dibujo", maxCount: 1 },
  ]),
  crearEntrenamiento
);

// Página propia de la sesión: editar título/descripción/planificación y
// opcionalmente agregar más videos o reemplazar el dibujo
router.put(
  "/:id",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadEntrenamiento.fields([
    { name: "videos", maxCount: 10 },
    { name: "dibujo", maxCount: 1 },
  ]),
  actualizarEntrenamiento
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

// Sirve la imagen del dibujo táctico de una sesión (solo cuerpo técnico)
router.get(
  "/:id/dibujo",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  obtenerArchivoDibujo
);

// Página de reflexión post-entrenamiento (solo cuerpo técnico)
router.get("/:id/reflexion", verificarToken, autorizarRoles(...CUERPO_TECNICO), obtenerReflexion);
router.put("/:id/reflexion", verificarToken, autorizarRoles(...CUERPO_TECNICO), actualizarReflexion);

module.exports = router;
