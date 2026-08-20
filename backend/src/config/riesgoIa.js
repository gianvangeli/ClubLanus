const db = require("../config/db");
const { armarContextoCompleto } = require("./contextoJugadorIa");
const { generarJSONDesdeTexto } = require("./gemini");
const { notificarCuerpoTecnico } = require("./notificaciones");

const RIESGOS_VALIDOS = ["verde", "amarillo", "rojo"];

const armarPrompt = (texto) =>
  [
    "Sos el asistente de riesgo de lesión del cuerpo técnico del Club Atlético Lanús.",
    "A partir de los siguientes datos reales de un jugador (lesiones, composición corporal, nutrición, cargas físicas/GPS de su categoría), evaluá su riesgo actual de lesión.",
    "Cruzá las señales entre sí (ej. carga física alta sumada a una lesión reciente sin alta, o composición corporal fuera de objetivo sumada a antecedentes de lesión) en vez de mirar cada dato por separado.",
    "",
    texto,
    "",
    "Respondé SIEMPRE JSON válido, sin texto adicional ni fences de markdown, con este schema exacto:",
    '{ "riesgo": "verde" | "amarillo" | "rojo", "motivo": string }',
    '"riesgo": verde = sin señales de riesgo relevantes, amarillo = alguna señal a vigilar, rojo = riesgo alto, requiere atención del cuerpo técnico.',
    '"motivo": una frase corta (máximo 160 caracteres) explicando el motivo principal. Si no hay datos suficientes para evaluar, respondé riesgo "verde" y motivo "Sin datos suficientes para evaluar".',
    "No inventes datos que no estén en el contexto.",
  ].join("\n");

// Recalcula el semáforo de riesgo de lesión de un jugador y lo guarda.
// Pensada para llamarse "fire and forget" (sin await) desde los puntos de
// carga de datos relevantes: nunca debe frenar la respuesta al cuerpo
// técnico que está cargando lesiones/composición/nutrición/cargas físicas.
const recalcularRiesgoIA = async (jugadorId) => {
  const contexto = await armarContextoCompleto(jugadorId);
  if (!contexto) return;

  const [previos] = await db.query("SELECT semaforo_riesgo_ia FROM jugadores WHERE id = ?", [jugadorId]);
  const riesgoPrevio = previos[0]?.semaforo_riesgo_ia || null;

  const resultado = await generarJSONDesdeTexto(armarPrompt(contexto.texto), "Error al calcular el riesgo de lesión");

  const riesgo = RIESGOS_VALIDOS.includes(resultado?.riesgo) ? resultado.riesgo : null;
  if (!riesgo) throw new Error("La IA no devolvió un riesgo válido");
  const motivo = typeof resultado.motivo === "string" ? resultado.motivo.slice(0, 300) : null;

  await db.query(
    "UPDATE jugadores SET semaforo_riesgo_ia = ?, motivo_riesgo_ia = ?, riesgo_ia_actualizado_en = NOW() WHERE id = ?",
    [riesgo, motivo, jugadorId]
  );

  if (riesgo === "rojo" && riesgoPrevio !== "rojo") {
    const { jugador } = contexto;
    await notificarCuerpoTecnico(
      "riesgo_lesion",
      `⚠️ Riesgo elevado de lesión: ${jugador.nombre} ${jugador.apellido}`,
      `/admin/jugadores/${jugadorId}/asistente-ia`
    );
  }
};

module.exports = { recalcularRiesgoIA };
