const db = require("../config/db");
const { generarConversacion } = require("../config/gemini");

// Cuántos mensajes previos (usuario + asistente) se le mandan a la IA como
// historial de la charla. Acota el tamaño del prompt en conversaciones
// largas sin perder el hilo reciente.
const MAX_HISTORIAL = 20;

// Cuántas filas de picos_rendimiento (de todo el plantel de la categoría) se
// le pasan como contexto a la IA. Alcanza y sobra para "sacar conclusiones"
// sin inflar el prompt con años de historial.
const MAX_FILAS_CONTEXTO = 200;

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

// Arma el contexto de datos (jugador + plantel de su categoría + cargas
// físicas ya cargadas) que la IA necesita para responder con criterio, en
// vez de alucinar números. Nunca se le manda al modelo más que esto: no ve
// otras secciones del jugador (nutrición, lesiones, etc.), solo cargas
// físicas — lo que corresponde a esta pestaña.
const armarContextoDatos = async (jugador) => {
  const [plantel] = await db.query(
    "SELECT id, nombre, apellido, posicion FROM jugadores WHERE categoria <=> ? ORDER BY apellido, nombre",
    [jugador.categoria]
  );

  const idsPlantel = plantel.map((j) => j.id);
  let picos = [];
  if (idsPlantel.length > 0) {
    const [filas] = await db.query(
      `SELECT jugador_id, fecha, partido, indicadores
       FROM picos_rendimiento
       WHERE jugador_id IN (?)
       ORDER BY fecha DESC, id DESC
       LIMIT ?`,
      [idsPlantel, MAX_FILAS_CONTEXTO]
    );
    picos = filas;
  }

  const nombrePorId = Object.fromEntries(plantel.map((j) => [j.id, `${j.nombre} ${j.apellido}`]));

  const listaPlantel = plantel
    .map((j) => `- id ${j.id}: ${j.nombre} ${j.apellido}${j.posicion ? ` (${j.posicion})` : ""}`)
    .join("\n") || "(sin otros jugadores cargados en esta categoría)";

  const listaCargas = picos
    .map((p) => {
      const indicadores = JSON.parse(p.indicadores)
        .map((i) => `${i.indicador}=${i.valor}`)
        .join(", ");
      const fecha = new Date(p.fecha).toISOString().slice(0, 10);
      return `- ${nombrePorId[p.jugador_id] || `jugador ${p.jugador_id}`} | ${fecha} | ${p.partido}: ${indicadores}`;
    })
    .join("\n") || "(todavía no hay cargas físicas cargadas en esta categoría)";

  return { listaPlantel, listaCargas };
};

const armarSystemInstruction = (jugador, contexto) =>
  [
    "Sos el asistente de preparación física del cuerpo técnico del Club Atlético Lanús.",
    "Estás dentro de la ficha de preparación física de un jugador puntual, pero tenés acceso a las cargas físicas de todo su plantel/categoría para poder comparar cuando te lo pidan.",
    "",
    `Jugador de esta ficha: ${jugador.nombre} ${jugador.apellido}${jugador.posicion ? ` (${jugador.posicion})` : ""}, categoría: ${jugador.categoria || "sin categoría asignada"}.`,
    "",
    "Plantel de esta categoría (id: nombre):",
    contexto.listaPlantel,
    "",
    "Cargas físicas cargadas (jugador | fecha | partido: indicador=valor, ...). Son datos reales del club, cargados a mano o importados de GPS:",
    contexto.listaCargas,
    "",
    "Tu trabajo: ayudar a pensar entrenamientos, comparar jugadores, explicar tendencias y sacar conclusiones a partir de estos datos.",
    "Nunca inventes números que no estén en la lista de cargas físicas. Si no hay datos suficientes para responder algo, decilo con claridad en vez de inventar.",
    "",
    'Si el pedido es explícitamente para generar un archivo/reporte descargable (ej. "hacé un archivo con los picos de cada jugador"), armá los datos en el campo "archivo" además de explicarlo en "respuesta". Si no piden un archivo, dejá "archivo" en null.',
    "Respondé SIEMPRE JSON válido, sin texto adicional ni fences de markdown, con este schema exacto:",
    '{ "respuesta": string, "archivo": null | { "nombre": string, "columnas": string[], "filas": (string|number)[][] } }',
    '"respuesta" es el mensaje conversacional para el cuerpo técnico (puede tener saltos de línea). "archivo.nombre" termina en ".csv". Cada fila de "archivo.filas" tiene la misma cantidad de elementos que "archivo.columnas".',
  ].join("\n");

// Lista el historial de la conversación de este jugador (no de todo el
// plantel: cada ficha tiene su propio hilo, aunque el contexto que reciba la
// IA sea más amplio).
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

    const [jugadores] = await db.query(
      "SELECT id, nombre, apellido, posicion, categoria FROM jugadores WHERE id = ?",
      [id]
    );
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }
    const jugador = jugadores[0];

    const [previos] = await db.query(
      `SELECT rol, contenido FROM chat_ia_mensajes WHERE jugador_id = ? ORDER BY id DESC LIMIT ?`,
      [id, MAX_HISTORIAL]
    );
    const historial = [...previos].reverse();
    historial.push({ rol: "usuario", contenido: mensaje.trim() });

    const contexto = await armarContextoDatos(jugador);
    const systemInstruction = armarSystemInstruction(jugador, contexto);

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
