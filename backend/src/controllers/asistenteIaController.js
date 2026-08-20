const db = require("../config/db");
const { generarConversacion } = require("../config/gemini");
const { armarContextoCompleto } = require("../config/contextoJugadorIa");

// Cuántos mensajes previos (usuario + asistente) se le mandan a la IA como
// historial de la charla. Acota el tamaño del prompt en conversaciones
// largas sin perder el hilo reciente.
const MAX_HISTORIAL = 20;

const parseArchivo = (archivoJson) => {
  if (!archivoJson) return null;
  return typeof archivoJson === "string" ? JSON.parse(archivoJson) : archivoJson;
};

const formatearMensaje = (fila) => ({
  id: fila.id,
  rol: fila.rol,
  contenido: fila.contenido,
  archivo: parseArchivo(fila.archivo_json),
  creado_en: fila.creado_en,
});

const armarSystemInstruction = (contexto) =>
  [
    "Sos el Asistente IA del cuerpo técnico del Club Atlético Lanús, dentro de la ficha de un jugador puntual.",
    "Tenés acceso a TODOS los datos cargados de este jugador (lesiones, composición corporal, nutrición/antropometría, cargas físicas/GPS de su plantel, análisis futbolístico) para poder comprender sus límites, cruzar información entre áreas y sacar conclusiones — no solo mirar un área aislada.",
    "",
    contexto.texto,
    "",
    "Plantel de su categoría (id: nombre), por si te piden comparar con compañeros:",
    contexto.listaPlantel,
    "",
    "Tu trabajo: responder preguntas del cuerpo técnico ayudándolos a pensar entrenamientos, anticipar riesgo de lesión, comparar jugadores, explicar tendencias y sacar conclusiones cruzando todos estos datos.",
    "Nunca inventes números que no estén en el contexto. Si no hay datos suficientes para responder algo, decilo con claridad en vez de inventar.",
    "",
    'Si el pedido es explícitamente para generar un archivo/reporte descargable (ej. "hacé un archivo con los picos de cada jugador"), armá los datos en el campo "archivo" además de explicarlo en "respuesta". Si no piden un archivo, dejá "archivo" en null.',
    "Respondé SIEMPRE JSON válido, sin texto adicional ni fences de markdown, con este schema exacto:",
    '{ "respuesta": string, "archivo": null | { "nombre": string, "columnas": string[], "filas": (string|number)[][] } }',
    '"respuesta" es el mensaje conversacional para el cuerpo técnico (puede tener saltos de línea). "archivo.nombre" termina en ".csv". Cada fila de "archivo.filas" tiene la misma cantidad de elementos que "archivo.columnas".',
  ].join("\n");

// Lista el historial de la conversación de este jugador (una sola charla
// por jugador, no por área).
const listarMensajes = async (req, res) => {
  try {
    const { id } = req.params;

    const [mensajes] = await db.query(
      `SELECT id, rol, contenido, archivo_json, creado_en
       FROM chat_ia_mensajes
       WHERE jugador_id = ?
       ORDER BY id ASC`,
      [id]
    );

    res.json(mensajes.map(formatearMensaje));
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el historial del chat",
      error: error.message,
    });
  }
};

const enviarMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje } = req.body;
    const usuarioId = req.usuario.id;

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ message: "Escribí un mensaje" });
    }

    const contexto = await armarContextoCompleto(id);
    if (!contexto) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const [previos] = await db.query(
      `SELECT rol, contenido FROM chat_ia_mensajes WHERE jugador_id = ? ORDER BY id DESC LIMIT ?`,
      [id, MAX_HISTORIAL]
    );
    const historial = [...previos].reverse();
    historial.push({ rol: "usuario", contenido: mensaje.trim() });

    const systemInstruction = armarSystemInstruction(contexto);

    let resultado;
    try {
      resultado = await generarConversacion(systemInstruction, historial);
    } catch (error) {
      return res.status(502).json({ message: error.message || "No se pudo generar la respuesta del chat" });
    }

    const respuestaTexto = typeof resultado?.respuesta === "string" ? resultado.respuesta : null;
    if (!respuestaTexto) {
      return res.status(502).json({ message: "La IA no devolvió una respuesta válida. Probá de nuevo." });
    }

    const archivo =
      resultado.archivo &&
      typeof resultado.archivo.nombre === "string" &&
      Array.isArray(resultado.archivo.columnas) &&
      Array.isArray(resultado.archivo.filas)
        ? {
            nombre: resultado.archivo.nombre,
            columnas: resultado.archivo.columnas.map(String),
            filas: resultado.archivo.filas.map((f) => (Array.isArray(f) ? f : [])),
          }
        : null;

    const [resultUsuario] = await db.query(
      `INSERT INTO chat_ia_mensajes (jugador_id, rol, contenido, creado_por) VALUES (?, 'usuario', ?, ?)`,
      [id, mensaje.trim(), usuarioId]
    );
    const [resultAsistente] = await db.query(
      `INSERT INTO chat_ia_mensajes (jugador_id, rol, contenido, archivo_json) VALUES (?, 'asistente', ?, ?)`,
      [id, respuestaTexto, archivo ? JSON.stringify(archivo) : null]
    );

    const [filasNuevas] = await db.query(
      `SELECT id, rol, contenido, archivo_json, creado_en FROM chat_ia_mensajes WHERE id IN (?, ?) ORDER BY id ASC`,
      [resultUsuario.insertId, resultAsistente.insertId]
    );

    res.status(201).json(filasNuevas.map(formatearMensaje));
  } catch (error) {
    res.status(500).json({
      message: "Error al enviar el mensaje",
      error: error.message,
    });
  }
};

const eliminarConversacion = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM chat_ia_mensajes WHERE jugador_id = ?", [id]);
    res.json({ message: "Conversación eliminada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar la conversación",
      error: error.message,
    });
  }
};

module.exports = { listarMensajes, enviarMensaje, eliminarConversacion };
