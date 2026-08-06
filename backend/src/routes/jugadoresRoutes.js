const express = require("express");
const router = express.Router();

const {
  crearJugador,
  listarJugadores,
  crearCuentaJugador,
  vincularUsuario,
  crearCuentaPsicologo,
  vincularPsicologo,
  obtenerJugador,
  actualizarJugador,
  eliminarJugador,
  actualizarAgente,
  actualizarContactoEmergencia,
  actualizarCaracteristicas,
  agregarComposicion,
  listarComposicion,
} = require("../controllers/jugadoresController");

const {
  agregarEvaluacionNutricional,
  listarEvaluacionesNutricionales,
  obtenerResumenNutricional,
} = require("../controllers/nutricionController");

const { obtenerDieta, guardarDieta } = require("../controllers/dietaJugadorController");

const {
  obtenerPerfilPsicosocial,
  guardarPerfilPsicosocial,
} = require("../controllers/perfilPsicosocialController");

const {
  crearPico,
  listarPicos,
  eliminarPico,
} = require("../controllers/picosRendimientoController");

const {
  crearCargaPreparacionFisica,
  listarCargasPreparacionFisica,
  eliminarCargaPreparacionFisica,
} = require("../controllers/cargasPreparacionFisicaController");

const {
  obtenerInformeFisico,
  guardarInformeFisico,
} = require("../controllers/informeFisicoController");

const {
  crearPlanEntrenamientoExtra,
  listarPlanesEntrenamientoExtra,
  obtenerArchivoPlanEntrenamientoExtra,
  eliminarPlanEntrenamientoExtra,
} = require("../controllers/planesEntrenamientoExtraController");

const {
  crearAnalisis,
  listarAnalisis,
  obtenerVideoAnalisis,
  eliminarAnalisis,
  actualizarSemaforoAnalisis,
} = require("../controllers/analisisFutbolisticoController");

const {
  crearDatoBigdata,
  listarDatosBigdata,
  obtenerArchivoDatoBigdata,
  eliminarDatoBigdata,
} = require("../controllers/datosBigdataController");

const {
  generarDiagnostico,
  listarDiagnosticos,
} = require("../controllers/diagnosticoIaController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadVideo = require("../middlewares/uploadMiddleware");
const uploadDocumento = require("../middlewares/uploadDocumentoMiddleware");
const uploadDatos = require("../middlewares/uploadDatosMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Registrar jugador (solo cuerpo técnico)
router.post("/", verificarToken, autorizarRoles(...CUERPO_TECNICO), crearJugador);

// Listar jugadores (solo cuerpo técnico)
router.get("/", verificarToken, autorizarRoles(...CUERPO_TECNICO), listarJugadores);

// Ficha de un jugador puntual
router.get("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), obtenerJugador);

// Editar datos de la ficha
router.put("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), actualizarJugador);

// Eliminar la ficha de un jugador (por error de carga del cuerpo técnico)
router.delete("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), eliminarJugador);

// Crear la cuenta de acceso del jugador (a partir de su mail) y vincularla
router.post(
  "/:id/cuenta",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  crearCuentaJugador
);

// Vincular una ficha de jugador con una cuenta de usuario ya existente
router.put(
  "/:id/vincular-usuario",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  vincularUsuario
);

// Crear la cuenta del psicólogo asignado al jugador y vincularla
router.post(
  "/:id/psicologo",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  crearCuentaPsicologo
);

// Vincular al jugador con una cuenta de psicólogo ya existente
router.put(
  "/:id/vincular-psicologo",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  vincularPsicologo
);

// Perfil psicosocial: informe único y permanente (no genera historial)
router.get(
  "/:id/perfil-psicosocial",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  obtenerPerfilPsicosocial
);
router.put(
  "/:id/perfil-psicosocial",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  guardarPerfilPsicosocial
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

// Características del jugador: pie hábil, posición en la cancha, minutos jugados
router.put(
  "/:id/caracteristicas",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  actualizarCaracteristicas
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

// Nutrición: cargar una nueva evaluación (siempre un registro nuevo, nunca
// se sobrescribe una evaluación anterior)
router.post(
  "/:id/nutricion",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  agregarEvaluacionNutricional
);

// Nutrición: historial completo de evaluaciones
router.get(
  "/:id/nutricion",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarEvaluacionesNutricionales
);

// Nutrición: resumen para la página principal (última evaluación + objetivos)
router.get(
  "/:id/nutricion/resumen",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  obtenerResumenNutricional
);

// Dieta personalizada: informe único y permanente por jugador
router.get(
  "/:id/dieta",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  obtenerDieta
);
router.put(
  "/:id/dieta",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  guardarDieta
);

// Preparación física — a) Picos de máximo rendimiento: alta, listado
// (para comparar entre fechas) y eliminación de una evaluación puntual
router.post(
  "/:id/picos-rendimiento",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  crearPico
);
router.get(
  "/:id/picos-rendimiento",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarPicos
);
router.delete(
  "/:id/picos-rendimiento/:picoId",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarPico
);

// Preparación física — b) Cargas físicas (registro de entrenamiento/partido)
router.post(
  "/:id/cargas-preparacion-fisica",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  crearCargaPreparacionFisica
);
router.get(
  "/:id/cargas-preparacion-fisica",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarCargasPreparacionFisica
);
router.delete(
  "/:id/cargas-preparacion-fisica/:cargaId",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarCargaPreparacionFisica
);

// Preparación física — c) Informe físico (portada): único y permanente
router.get(
  "/:id/informe-fisico",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  obtenerInformeFisico
);
router.put(
  "/:id/informe-fisico",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  guardarInformeFisico
);

// Preparación física — d) Entrenamientos extra: planes individuales
router.post(
  "/:id/planes-entrenamiento-extra",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadDocumento.single("archivo"),
  crearPlanEntrenamientoExtra
);
router.get(
  "/:id/planes-entrenamiento-extra",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarPlanesEntrenamientoExtra
);
router.get(
  "/:id/planes-entrenamiento-extra/:planId/archivo",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  obtenerArchivoPlanEntrenamientoExtra
);
router.delete(
  "/:id/planes-entrenamiento-extra/:planId",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarPlanEntrenamientoExtra
);

// Análisis futbolístico: informes técnicos/tácticos (mensuales,
// trimestrales, anuales), con video opcional. Se acumulan cronológicamente.
router.post(
  "/:id/analisis-futbolistico",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadVideo.single("video"),
  crearAnalisis
);
router.get(
  "/:id/analisis-futbolistico",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarAnalisis
);
router.get(
  "/:id/analisis-futbolistico/:analisisId/video",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  obtenerVideoAnalisis
);
router.delete(
  "/:id/analisis-futbolistico/:analisisId",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarAnalisis
);

// Análisis futbolístico: semáforo de chances de jugar en primera (estado
// único y actual, lo carga el cuerpo técnico)
router.put(
  "/:id/analisis-futbolistico/semaforo",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  actualizarSemaforoAnalisis
);

// Diagnóstico con IA: dentro de cada área (nutrición, lesiones, ...),
// genera un diagnóstico con pasos para evolucionar usando solo los datos
// de esa área. Se acumulan cronológicamente por área, igual que análisis
// futbolístico.
router.post(
  "/:id/diagnostico-ia/:area",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  generarDiagnostico
);
router.get(
  "/:id/diagnostico-ia/:area",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarDiagnosticos
);

// Datos (Big Data): importación de datos estadísticos por partido. Se
// acumulan cronológicamente.
router.post(
  "/:id/datos-bigdata",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadDatos.single("archivo"),
  crearDatoBigdata
);
router.get(
  "/:id/datos-bigdata",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarDatosBigdata
);
router.get(
  "/:id/datos-bigdata/:datoId/archivo",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  obtenerArchivoDatoBigdata
);
router.delete(
  "/:id/datos-bigdata/:datoId",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarDatoBigdata
);

module.exports = router;
