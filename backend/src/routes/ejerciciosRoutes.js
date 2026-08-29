const express = require("express");
const router = express.Router();

const {
  crearEjercicio,
  listarEjercicios,
  obtenerEjercicio,
  actualizarEjercicio,
  eliminarEjercicio,
  buscarEjercicios,
  reutilizarEjercicio,
  agregarVideoEjercicio,
  eliminarVideoEjercicio,
  obtenerArchivoVideoEjercicio,
  obtenerArchivoPizarra,
  guardarAnimacionEjercicio,
  obtenerArchivoAnimacion,
} = require("../controllers/ejerciciosController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadVideo = require("../middlewares/uploadMiddleware");
const uploadPizarra = require("../middlewares/uploadPizarraMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Material de planificación: exclusivo del cuerpo técnico, el jugador no
// tiene acceso a ninguna de estas rutas.
router.use(verificarToken, autorizarRoles(...CUERPO_TECNICO));

// "/buscar" va antes de "/:id" para que no lo capture como un id.
router.get("/buscar", buscarEjercicios);
router.post("/entrenamiento/:entrenamientoId", crearEjercicio);
router.get("/entrenamiento/:entrenamientoId", listarEjercicios);
router.post("/entrenamiento/:entrenamientoId/reutilizar/:origenId", reutilizarEjercicio);
router.get("/:id", obtenerEjercicio);
router.put(
  "/:id",
  uploadPizarra.fields([{ name: "pizarra_archivo", maxCount: 1 }]),
  actualizarEjercicio
);
router.delete("/:id", eliminarEjercicio);
router.get("/:id/pizarra-archivo", obtenerArchivoPizarra);

// Animación generada por la pizarra táctica (sistema de escenas -> video,
// grabado en el navegador). Reemplaza a la anterior en vez de acumular.
router.get("/:id/animacion-archivo", obtenerArchivoAnimacion);
router.post("/:id/animacion", uploadPizarra.single("animacion"), guardarAnimacionEjercicio);

// Video real de la ejecución del ejercicio (para comparar con la animación
// de la pizarra)
router.post("/:id/videos", uploadVideo.array("videos", 5), agregarVideoEjercicio);
router.delete("/videos/:videoId", eliminarVideoEjercicio);
router.get("/videos/:videoId/archivo", obtenerArchivoVideoEjercicio);

module.exports = router;
