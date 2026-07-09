const express = require("express");
const router = express.Router();

const {
  crearJugador,
  listarJugadores,
  vincularUsuario,
  obtenerJugador,
  actualizarJugador,
  actualizarAgente,
  actualizarContactoEmergencia,
  agregarComposicion,
  listarComposicion,
  agregarVideoJugador,
  listarVideosJugador,
} = require("../controllers/jugadoresController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadVideo = require("../middlewares/uploadMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Registrar jugador (solo cuerpo técnico)
router.post("/", verificarToken, autorizarRoles(...CUERPO_TECNICO), crearJugador);

// Listar jugadores (solo cuerpo técnico)
router.get("/", verificarToken, autorizarRoles(...CUERPO_TECNICO), listarJugadores);

// Ficha de un jugador puntual
router.get("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), obtenerJugador);

// Editar datos de la ficha
router.put("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), actualizarJugador);

// Vincular una ficha de jugador con su cuenta de usuario
router.put(
  "/:id/vincular-usuario",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  vincularUsuario
);

// Datos del agente del jugador
router.put(
  "/:id/agente",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  actualizarAgente
);

// Contacto de emergencia del jugador
router.put(
  "/:id/contacto-emergencia",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  actualizarContactoEmergencia
);

// Composición corporal: cargar medición (peso + % grasa corporal)
router.post(
  "/:id/composicion",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  agregarComposicion
);

// Composición corporal: historial de mediciones
router.get(
  "/:id/composicion",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarComposicion
);

// Videos del jugador: cualquier formato (archivo o link), sin categorías.
// Admite varios archivos en una sola carga (hasta 20).
router.post(
  "/:id/videos",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadVideo.array("videos", 20),
  agregarVideoJugador
);

// Videos del jugador: listado
router.get(
  "/:id/videos",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarVideosJugador
);

module.exports = router;
