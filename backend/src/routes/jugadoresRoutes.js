const express = require("express");
const router = express.Router();

const {
  crearJugador,
  listarJugadores,
  crearCuentaJugador,
  restablecerPasswordJugador,
  vincularUsuario,
  crearCuentaPsicologo,
  vincularPsicologo,
  obtenerJugador,
  actualizarJugador,
  subirFotoJugador,
  eliminarFotoJugador,
  obtenerFotoJugador,
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
  previsualizarEvaluacionPdf,
} = require("../controllers/nutricionController");

const {
  obtenerDieta,
  obtenerMiPlanAlimentacion,
  guardarDietaArmada,
  guardarDietaArchivo,
  subirImagenSeccion,
  obtenerArchivoDieta,
} = require("../controllers/dietaJugadorController");

const {
  obtenerPerfilPsicosocial,
  guardarPerfilPsicosocial,
} = require("../controllers/perfilPsicosocialController");

const {
  crearPico,
  listarPicos,
  eliminarPico,
  compararJugadores,
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
  listarMensajes: listarMensajesAsistenteIa,
  enviarMensaje: enviarMensajeAsistenteIa,
  eliminarConversacion: eliminarConversacionAsistenteIa,
} = require("../controllers/asistenteIaController");

const {
  subirVideoJugador,
  listarVideosJugador,
  listarMisVideos,
  obtenerArchivoVideoJugador,
  eliminarVideoJugador,
} = require("../controllers/jugadorVideosController");

const {
  crearPlanEntrenamientoExtra,
  listarPlanesEntrenamientoExtra,
  obtenerMisEntrenamientosExtra,
  obtenerArchivoPlanEntrenamientoExtra,
  eliminarPlanEntrenamientoExtra,
  agregarRegistroProgreso,
  listarRegistrosProgreso,
  listarMiProgreso,
  eliminarRegistroProgreso,
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

const {
  previsualizarImportacionGps,
  confirmarImportacionGps,
} = require("../controllers/gpsImportController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadVideo = require("../middlewares/uploadMiddleware");
const uploadDocumento = require("../middlewares/uploadDocumentoMiddleware");
const uploadImage = require("../middlewares/uploadImageMiddleware");
const uploadDatos = require("../middlewares/uploadDatosMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Registrar jugador (solo cuerpo técnico)
router.post("/", verificarToken, autorizarRoles(...CUERPO_TECNICO), crearJugador);

// Listar jugadores (solo cuerpo técnico)
router.get("/", verificarToken, autorizarRoles(...CUERPO_TECNICO), listarJugadores);

// El jugador ve su propio plan de alimentación (no puede pedir el de
// otro). Registrada antes de "/:id" para que no la capture ese patrón.
router.get(
  "/mi-plan-alimentacion",
  verificarToken,
  autorizarRoles("jugador"),
  obtenerMiPlanAlimentacion
);

// El jugador ve sus propios planes de entrenamiento extra y su progreso
// registrado en todos ellos junto. También antes de "/:id" por lo mismo.
router.get(
  "/mis-entrenamientos-extra",
  verificarToken,
  autorizarRoles("jugador"),
  obtenerMisEntrenamientosExtra
);
router.get(
  "/mi-progreso-entrenamiento-extra",
  verificarToken,
  autorizarRoles("jugador"),
  listarMiProgreso
);

// El jugador ve sus propios videos individuales. También antes de "/:id".
router.get(
  "/mis-videos",
  verificarToken,
  autorizarRoles("jugador"),
  listarMisVideos
);

// Ficha de un jugador puntual
router.get("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), obtenerJugador);

// Editar datos de la ficha
router.put("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), actualizarJugador);

// Eliminar la ficha de un jugador (por error de carga del cuerpo técnico)
router.delete("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), eliminarJugador);

// Foto de perfil del jugador (reemplaza el avatar de iniciales)
router.post(
  "/:id/foto",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadImage.single("foto"),
  subirFotoJugador
);
router.delete(
  "/:id/foto",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarFotoJugador
);
router.get("/:id/foto", verificarToken, autorizarRoles(...CUERPO_TECNICO), obtenerFotoJugador);

// Crear la cuenta de acceso del jugador (a partir de su mail) y vincularla
router.post(
  "/:id/cuenta",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  crearCuentaJugador
);

// Restablecer la contraseña de la cuenta ya vinculada (genera una nueva
// provisoria; nunca se guarda/expone la anterior)
router.put(
  "/:id/cuenta/restablecer-password",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  restablecerPasswordJugador
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

// Nutrición: leer el PDF de una evaluación individual con IA (preview, no
// guarda nada — precarga el formulario de carga manual)
router.post(
  "/:id/nutricion/importar-pdf",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadDatos.single("archivo"),
  previsualizarEvaluacionPdf
);

// Nutrición: resumen para la página principal (última evaluación + objetivos)
router.get(
  "/:id/nutricion/resumen",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  obtenerResumenNutricional
);

// Plan de alimentación individual (ex "dieta personalizada"): informe
// único y permanente por jugador, armado en la app (secciones) o subido
// como archivo. El cuerpo técnico gestiona; el jugador solo ve el suyo.
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
  guardarDietaArmada
);
router.post(
  "/:id/dieta/archivo",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadDocumento.single("archivo"),
  guardarDietaArchivo
);
router.post(
  "/:id/dieta/imagen",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadImage.single("imagen"),
  subirImagenSeccion
);
// Sirve el archivo del plan: cuerpo técnico siempre, jugador solo el suyo
// (la comprobación de que sea su propio jugador va dentro del controller).
router.get(
  "/:id/dieta/archivo",
  verificarToken,
  obtenerArchivoDieta
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

// Comparar un indicador entre varios jugadores (Cargas físicas). Path bajo
// "/picos-rendimiento/comparar" (no "/:id/...") para no compartir prefijo
// con las rutas de arriba y no haya ambigüedad de matching con Express.
router.get(
  "/picos-rendimiento/comparar",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  compararJugadores
);

// Preparación física — importación de GPS grupal por PDF con IA: analiza
// el PDF y arma un preview por jugador (no guarda nada), y confirma
// (guarda) las filas ya revisadas por el cuerpo técnico. Rutas bajo
// "/gps" (no "/picos-rendimiento") para no compartir prefijo con
// "/:id/picos-rendimiento" de arriba.
router.post(
  "/gps/importar-pdf",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadDatos.single("archivo"),
  previsualizarImportacionGps
);
router.post(
  "/gps/confirmar",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  confirmarImportacionGps
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

// Asistente IA: chat único por jugador, con contexto de todas sus áreas
// (lesiones, composición corporal, nutrición, cargas físicas/GPS de su
// categoría, análisis futbolístico).
router.get(
  "/:id/asistente-ia",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarMensajesAsistenteIa
);
router.post(
  "/:id/asistente-ia",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  enviarMensajeAsistenteIa
);
router.delete(
  "/:id/asistente-ia",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarConversacionAsistenteIa
);

// Videos individuales del jugador: segunda vía de "Biblioteca", pensada
// para video personal y libre (sin paso de asignación).
router.get(
  "/videos/:videoId/archivo",
  verificarToken,
  obtenerArchivoVideoJugador
);
router.post(
  "/:id/videos",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadVideo.single("video"),
  subirVideoJugador
);
router.get(
  "/:id/videos",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  listarVideosJugador
);
router.delete(
  "/:id/videos/:videoId",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarVideoJugador
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
// El archivo lo puede ver el cuerpo técnico siempre, y el jugador solo si
// el plan es suyo (la comprobación va dentro del controller).
router.get(
  "/:id/planes-entrenamiento-extra/:planId/archivo",
  verificarToken,
  obtenerArchivoPlanEntrenamientoExtra
);
router.delete(
  "/:id/planes-entrenamiento-extra/:planId",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  eliminarPlanEntrenamientoExtra
);

// Seguimiento del jugador sobre un plan (peso, duración, horario,
// observaciones). El jugador carga y borra el suyo; el cuerpo técnico solo
// puede ver (para "trabajar con la información que completa") y moderar.
router.post(
  "/planes-entrenamiento-extra/:planId/registros",
  verificarToken,
  autorizarRoles("jugador"),
  agregarRegistroProgreso
);
router.get(
  "/planes-entrenamiento-extra/:planId/registros",
  verificarToken,
  listarRegistrosProgreso
);
router.delete(
  "/planes-entrenamiento-extra/registros/:registroId",
  verificarToken,
  eliminarRegistroProgreso
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
