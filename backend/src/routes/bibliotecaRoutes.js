const express = require("express");
const router = express.Router();

const {
  crearPublicacion,
  listarBibliotecaJugador,
  agregarVideoABiblioteca,
  asignarUsuariosABiblioteca,
  abrirVisualizacion,
  actualizarProgreso,
  obtenerReporteVisualizaciones,
  obtenerArchivoVideo,
  listarBibliotecaStaff,
  verDetallePublicacion,
  listarUsuariosJugadores,
} = require("../controllers/bibliotecaController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadVideo = require("../middlewares/uploadMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

//Crear una publicacion
router.post(
  "/",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  crearPublicacion
);

//Ver biblioteca del jugador (solo publicaciones asignadas)
router.get(
  "/",
  verificarToken,
  autorizarRoles("jugador"),
  listarBibliotecaJugador
);

//Listado completo de publicaciones para gestión (cuerpo técnico)
router.get(
  "/admin",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarBibliotecaStaff
);

//Cuentas de jugadores registradas, para asignarlas a una publicación
router.get(
  "/usuarios-jugadores",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarUsuariosJugadores
);

//Descargar/reproducir un video subido como archivo
router.get(
  "/videos/:videoId/archivo",
  verificarToken,
  obtenerArchivoVideo
);

//Agregar un video a una publicacion (archivo subido o link externo)
router.post(
  "/:id/videos",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadVideo.single("video"),
  agregarVideoABiblioteca
);

//Asignar una publicacion a uno o varios usuarios
router.post(
  "/:id/usuarios",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  asignarUsuariosABiblioteca
);

//El jugador abre una publicación (cuenta como visualización)
router.post(
  "/:id/abrir",
  verificarToken,
  autorizarRoles("jugador"),
  abrirVisualizacion
);

//El jugador reporta su avance de reproducción
router.put(
  "/:id/progreso",
  verificarToken,
  autorizarRoles("jugador"),
  actualizarProgreso
);

//El cuerpo técnico ve el reporte de visualizaciones de una publicación
router.get(
  "/:id/reporte",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  obtenerReporteVisualizaciones
);

//Detalle de una publicación (con sus videos). Válido para jugador y cuerpo técnico.
router.get(
  "/:id",
  verificarToken,
  verDetallePublicacion
);

module.exports = router;
