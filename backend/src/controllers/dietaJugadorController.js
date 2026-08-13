const db = require("../config/db");
const { guardarArchivo, servirArchivo, eliminarArchivo } = require("../config/storage");
const { notificarJugador } = require("../config/notificaciones");

// Arma la respuesta que consumen tanto la vista del cuerpo técnico como la
// del jugador: secciones parseadas, mismo shape para los dos.
const formatearDieta = (fila) => {
  if (!fila) return { modo: null, secciones: null, archivo_nombre_original: null, actualizado_en: null };
  return {
    modo: fila.modo,
    secciones: fila.secciones_json ? JSON.parse(fila.secciones_json) : null,
    archivo_nombre_original: fila.archivo_nombre_original,
    actualizado_en: fila.actualizado_en,
  };
};

// Dieta personalizada / plan de alimentación: informe único y permanente
// por jugador (no histórico). Independiente de las evaluaciones y de los
// objetivos de la categoría.
const obtenerDieta = async (req, res) => {
  try {
    const { id } = req.params;

    const [dietas] = await db.query(
      "SELECT modo, secciones_json, archivo_nombre_original, actualizado_en FROM dietas_jugador WHERE jugador_id = ?",
      [id]
    );

    res.json(formatearDieta(dietas[0]));
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el plan de alimentación",
      error: error.message,
    });
  }
};

// El jugador ve su propio plan (resuelto a partir de su cuenta, no puede
// pedir el de otro jugador pasando un id).
const obtenerMiPlanAlimentacion = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE usuario_id = ?", [usuarioId]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "No se encontró tu ficha de jugador" });
    }

    const [dietas] = await db.query(
      "SELECT modo, secciones_json, archivo_nombre_original, actualizado_en FROM dietas_jugador WHERE jugador_id = ?",
      [jugadores[0].id]
    );

    res.json({ jugador_id: jugadores[0].id, ...formatearDieta(dietas[0]) });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener tu plan de alimentación",
      error: error.message,
    });
  }
};

// Guarda el plan "armado" en la app: secciones con título + texto +
// imagen opcional (la imagen ya se subió antes con subirImagenSeccion, acá
// solo se guarda su URL dentro de cada sección). Si el jugador tenía un
// plan por archivo cargado, lo reemplaza y borra ese archivo.
const guardarDietaArmada = async (req, res) => {
  try {
    const { id } = req.params;
    const { secciones } = req.body;
    const actualizadoPor = req.usuario.id;

    if (!Array.isArray(secciones)) {
      return res.status(400).json({ message: "Faltan las secciones del plan" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const [existentes] = await db.query("SELECT archivo_url FROM dietas_jugador WHERE jugador_id = ?", [id]);
    if (existentes[0]?.archivo_url) {
      eliminarArchivo(existentes[0].archivo_url);
    }

    await db.query(
      `INSERT INTO dietas_jugador (jugador_id, modo, secciones_json, archivo_url, archivo_nombre_original, actualizado_por)
       VALUES (?, 'armado', ?, NULL, NULL, ?)
       ON DUPLICATE KEY UPDATE
         modo = 'armado', secciones_json = VALUES(secciones_json),
         archivo_url = NULL, archivo_nombre_original = NULL, actualizado_por = VALUES(actualizado_por)`,
      [id, JSON.stringify(secciones), actualizadoPor]
    );

    await notificarJugador(id, "plan_alimentacion", "Se subió un nuevo plan de alimentación", "/plan-alimentacion");

    res.json({ message: "Plan de alimentación guardado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar el plan de alimentación",
      error: error.message,
    });
  }
};

// Guarda el plan como un único archivo ya armado (PDF, Word o imagen), en
// vez de secciones. Si el jugador tenía un plan armado o un archivo
// anterior, los reemplaza (y borra el archivo viejo).
const guardarDietaArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizadoPor = req.usuario.id;

    if (!req.file) {
      return res.status(400).json({ message: "Subí el archivo del plan de alimentación" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const [existentes] = await db.query("SELECT archivo_url FROM dietas_jugador WHERE jugador_id = ?", [id]);
    if (existentes[0]?.archivo_url) {
      eliminarArchivo(existentes[0].archivo_url);
    }

    const url = await guardarArchivo(req.file.buffer, "planes-alimentacion", req.file.originalname);

    await db.query(
      `INSERT INTO dietas_jugador (jugador_id, modo, secciones_json, archivo_url, archivo_nombre_original, actualizado_por)
       VALUES (?, 'archivo', NULL, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         modo = 'archivo', secciones_json = NULL,
         archivo_url = VALUES(archivo_url), archivo_nombre_original = VALUES(archivo_nombre_original),
         actualizado_por = VALUES(actualizado_por)`,
      [id, url, req.file.originalname, actualizadoPor]
    );

    await notificarJugador(id, "plan_alimentacion", "Se subió un nuevo plan de alimentación", "/plan-alimentacion");

    res.json({ message: "Plan de alimentación guardado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar el plan de alimentación",
      error: error.message,
    });
  }
};

// Sube una imagen suelta para usar dentro de una sección del plan armado
// (no queda asociada a nada todavía: el frontend guarda la URL devuelta en
// la sección correspondiente y recién se persiste al guardar el plan).
const subirImagenSeccion = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Subí una imagen" });
    }
    const url = await guardarArchivo(req.file.buffer, "planes-alimentacion", req.file.originalname);
    res.status(201).json({ url });
  } catch (error) {
    res.status(500).json({
      message: "Error al subir la imagen",
      error: error.message,
    });
  }
};

// Sirve el archivo del plan (PDF/Word/imagen). Cuerpo técnico siempre
// puede; el jugador solo si es el archivo de su propio plan.
const obtenerArchivoDieta = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.usuario;
    const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

    if (!CUERPO_TECNICO.includes(usuario.rol)) {
      const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ? AND usuario_id = ?", [id, usuario.id]);
      if (jugadores.length === 0) {
        return res.status(403).json({ message: "No tenés acceso a este archivo" });
      }
    }

    const [dietas] = await db.query("SELECT archivo_url FROM dietas_jugador WHERE jugador_id = ?", [id]);
    if (!dietas[0]?.archivo_url) {
      return res.status(404).json({ message: "Este jugador no tiene un archivo de plan de alimentación" });
    }

    await servirArchivo(req, res, dietas[0].archivo_url);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el archivo",
      error: error.message,
    });
  }
};

module.exports = {
  obtenerDieta,
  obtenerMiPlanAlimentacion,
  guardarDietaArmada,
  guardarDietaArchivo,
  subirImagenSeccion,
  obtenerArchivoDieta,
};
