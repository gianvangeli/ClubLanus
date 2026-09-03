const express = require("express");
const router = express.Router();

const {
  crearPublicacion,
  actualizarPublicacion,
  listarBibliotecaJugador,
  agregarVideoABiblioteca,
  asignarUsuariosABiblioteca,
  abrirVisualizacion,
  actualizarProgreso,
  obtenerReporteVisualizaciones,
  obtenerArchivoVideo,
  generarDiagnosticoVideoIA,
  listarDiagnosticosVideoIA,
  subirAnalisisPdf,
  obtenerArchivoAnalisisPdf,
  listarBibliotecaStaff,
  verDetallePublicacion,
  eliminarPublicacion,
  listarUsuariosJugadores,
} = require("../controllers/bibliotecaController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadVideo = require("../middlewares/uploadMiddleware");
const uploadDocumento = require("../middlewares/uploadDocumentoMiddleware");

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

//Generar un diagnóstico táctico por IA a partir de un video ya cargado
router.post(
  "/videos/:videoId/diagnostico-ia",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  generarDiagnosticoVideoIA
);

//Historial de diagnósticos generados para un video
router.get(
  "/videos/:videoId/diagnostico-ia",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarDiagnosticosVideoIA
);

//Agregar un video a una publicacion (archivo subido o link externo)
router.post(
  "/:id/videos",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadVideo.single("video"),
  agregarVideoABiblioteca
);

//Subir el PDF de analisis rival (alternativa a armarlo en la app)
router.post(
  "/:id/analisis-pdf",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadDocumento.single("archivo"),
  subirAnalisisPdf
);

//Descargar/ver el PDF de analisis rival
router.get(
  "/:id/analisis-pdf/archivo",
  verificarToken,
  obtenerArchivoAnalisisPdf
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

//Editar datos de una publicación (título, descripción, estado, tipo de análisis, plan de partido)
router.put(
  "/:id",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  actualizarPublicacion
);

//Eliminar una publicación (y todo lo que dependa de ella)
router.delete(
  "/:id",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarPublicacion
);

module.exports = router;
