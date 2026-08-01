const express = require("express");
const router = express.Router();

const {
  listarCategorias,
  crearEjercicioTactico,
  listarEjerciciosTacticos,
  obtenerEjercicioTactico,
  actualizarEjercicioTactico,
  eliminarEjercicioTactico,
  obtenerArchivoVideo,
} = require("../controllers/ejerciciosTacticosController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadVideo = require("../middlewares/uploadMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];
const TODO_EL_PLANTEL = [...CUERPO_TECNICO, "jugador"];

// Visible para todo el plantel (igual que el resto de Entrenamientos)
router.get("/categorias", verificarToken, autorizarRoles(...TODO_EL_PLANTEL), listarCategorias);
router.get("/", verificarToken, autorizarRoles(...TODO_EL_PLANTEL), listarEjerciciosTacticos);
router.get("/:id", verificarToken, autorizarRoles(...TODO_EL_PLANTEL), obtenerEjercicioTactico);
router.get("/:id/archivo", verificarToken, autorizarRoles(...TODO_EL_PLANTEL), obtenerArchivoVideo);

// Alta, edición y borrado: solo cuerpo técnico
router.post(
  "/",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadVideo.single("video"),
  crearEjercicioTactico
);
router.put("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), actualizarEjercicioTactico);
router.delete("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), eliminarEjercicioTactico);

module.exports = router;
