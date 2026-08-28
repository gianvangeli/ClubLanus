const express = require("express");
const router = express.Router();

const {
  listarCategorias,
  crearEjercicioTactico,
  listarEjerciciosTacticos,
  obtenerEjercicioTactico,
  actualizarEjercicioTactico,
  duplicarEjercicioTactico,
  eliminarEjercicioTactico,
  obtenerArchivoVideo,
  guardarAnimacionEjercicioTactico,
  obtenerArchivoAnimacion,
  obtenerArchivoPizarra,
} = require("../controllers/ejerciciosTacticosController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadPizarra = require("../middlewares/uploadPizarraMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// "Entrenamientos desglosados" es exclusivo del cuerpo técnico: el jugador
// no tiene acceso a ninguna de estas rutas.
router.use(verificarToken, autorizarRoles(...CUERPO_TECNICO));

router.get("/categorias", listarCategorias);
router.get("/", listarEjerciciosTacticos);
router.get("/:id", obtenerEjercicioTactico);
router.get("/:id/archivo", obtenerArchivoVideo);
router.get("/:id/animacion-archivo", obtenerArchivoAnimacion);
router.get("/:id/pizarra-archivo", obtenerArchivoPizarra);

router.post(
  "/",
  uploadPizarra.fields([
    { name: "video", maxCount: 1 },
    { name: "pizarra_archivo", maxCount: 1 },
  ]),
  crearEjercicioTactico
);
router.put(
  "/:id",
  uploadPizarra.fields([
    { name: "video", maxCount: 1 },
    { name: "pizarra_archivo", maxCount: 1 },
  ]),
  actualizarEjercicioTactico
);
router.delete("/:id", eliminarEjercicioTactico);
router.post("/:id/duplicar", duplicarEjercicioTactico);

// Animación generada por la pizarra táctica (sistema de escenas -> video,
// grabado en el navegador). Reemplaza a la anterior en vez de acumular.
router.post("/:id/animacion", uploadPizarra.single("animacion"), guardarAnimacionEjercicioTactico);

module.exports = router;
