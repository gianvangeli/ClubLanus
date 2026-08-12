const db = require("../config/db");
const { guardarArchivo, servirArchivo, eliminarArchivo } = require("../config/storage");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Registra un plan de entrenamiento extra individual (fecha + archivo
// opcional + informe explicando el porqué del plan). Cada plan es un
// registro propio.
const crearPlanEntrenamientoExtra = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, informe } = req.body;
    const registradoPor = req.usuario.id;

    if (!fecha) {
      return res.status(400).json({ message: "La fecha es obligatoria" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    let archivo = null;
    let nombreArchivo = null;
    if (req.file) {
      archivo = await guardarArchivo(req.file.buffer, "planes-entrenamiento-extra", req.file.originalname);
      nombreArchivo = req.file.originalname;
    }

    const [result] = await db.query(
      `INSERT INTO planes_entrenamiento_extra (jugador_id, fecha, archivo, nombre_archivo, informe, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, fecha, archivo, nombreArchivo, informe || null, registradoPor]
    );

    res.status(201).json({
      message: "Plan de entrenamiento registrado correctamente",
      plan_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar el plan de entrenamiento",
      error: error.message,
    });
  }
};

const listarPlanesEntrenamientoExtra = async (req, res) => {
  try {
    const { id } = req.params;

    const [planes] = await db.query(
      `SELECT id, fecha, nombre_archivo, informe, creado_en
       FROM planes_entrenamiento_extra
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [id]
    );

    res.json(planes);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los planes de entrenamiento",
      error: error.message,
    });
  }
};

// El jugador ve sus propios planes (resueltos a partir de su cuenta, no
// puede pedir los de otro jugador pasando un id).
const obtenerMisEntrenamientosExtra = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE usuario_id = ?", [usuarioId]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "No se encontró tu ficha de jugador" });
    }

    const [planes] = await db.query(
      `SELECT id, fecha, nombre_archivo, informe, creado_en
       FROM planes_entrenamiento_extra
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [jugadores[0].id]
    );

    res.json({ jugador_id: jugadores[0].id, planes });
  } catch (error) {
    res.status(500).json({
      message: "Error al listar tus planes de entrenamiento",
      error: error.message,
    });
  }
};

// Sirve el archivo de un plan: cuerpo técnico siempre puede; el jugador
// solo si el plan es suyo.
const obtenerArchivoPlanEntrenamientoExtra = async (req, res) => {
  try {
    const { planId } = req.params;
    const usuario = req.usuario;

    const [planes] = await db.query(
      "SELECT archivo, jugador_id FROM planes_entrenamiento_extra WHERE id = ?",
      [planId]
    );

    if (planes.length === 0 || !planes[0].archivo) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    if (!CUERPO_TECNICO.includes(usuario.rol)) {
      const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ? AND usuario_id = ?", [
        planes[0].jugador_id,
        usuario.id,
      ]);
      if (jugadores.length === 0) {
        return res.status(403).json({ message: "No tenés acceso a este archivo" });
      }
    }

    await servirArchivo(req, res, planes[0].archivo);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el archivo",
      error: error.message,
    });
  }
};

const eliminarPlanEntrenamientoExtra = async (req, res) => {
  try {
    const { planId } = req.params;

    const [planes] = await db.query(
      "SELECT archivo FROM planes_entrenamiento_extra WHERE id = ?",
      [planId]
    );

    if (planes.length === 0) {
      return res.status(404).json({ message: "Plan no encontrado" });
    }

    await db.query("DELETE FROM planes_entrenamiento_extra WHERE id = ?", [planId]);

    if (planes[0].archivo) {
      eliminarArchivo(planes[0].archivo);
    }

    res.json({ message: "Plan eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar el plan",
      error: error.message,
    });
  }
};

// El jugador registra su propio seguimiento de un plan (peso usado,
// duración, horario, observaciones). Solo puede cargar contra un plan
// que sea suyo.
const agregarRegistroProgreso = async (req, res) => {
  try {
    const { planId } = req.params;
    const { fecha, peso_kg, duracion_min, horario, observaciones } = req.body;
    const usuario = req.usuario;

    if (!fecha) {
      return res.status(400).json({ message: "La fecha es obligatoria" });
    }

    const [planes] = await db.query("SELECT jugador_id FROM planes_entrenamiento_extra WHERE id = ?", [planId]);
    if (planes.length === 0) {
      return res.status(404).json({ message: "Plan no encontrado" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ? AND usuario_id = ?", [
      planes[0].jugador_id,
      usuario.id,
    ]);
    if (jugadores.length === 0) {
      return res.status(403).json({ message: "Este plan no te pertenece" });
    }

    const [result] = await db.query(
      `INSERT INTO entrenamiento_extra_registros (plan_id, fecha, peso_kg, duracion_min, horario, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [planId, fecha, peso_kg || null, duracion_min || null, horario || null, observaciones || null]
    );

    res.status(201).json({ message: "Progreso registrado correctamente", registro_id: result.insertId });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar el progreso",
      error: error.message,
    });
  }
};

// Lista el seguimiento de un plan: el cuerpo técnico siempre puede (para
// "trabajar con la información que el jugador completa"); el jugador solo
// si el plan es suyo.
const listarRegistrosProgreso = async (req, res) => {
  try {
    const { planId } = req.params;
    const usuario = req.usuario;

    const [planes] = await db.query("SELECT jugador_id FROM planes_entrenamiento_extra WHERE id = ?", [planId]);
    if (planes.length === 0) {
      return res.status(404).json({ message: "Plan no encontrado" });
    }

    if (!CUERPO_TECNICO.includes(usuario.rol)) {
      const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ? AND usuario_id = ?", [
        planes[0].jugador_id,
        usuario.id,
      ]);
      if (jugadores.length === 0) {
        return res.status(403).json({ message: "Este plan no te pertenece" });
      }
    }

    const [registros] = await db.query(
      `SELECT id, fecha, peso_kg, duracion_min, horario, observaciones
       FROM entrenamiento_extra_registros
       WHERE plan_id = ?
       ORDER BY fecha DESC, id DESC`,
      [planId]
    );

    res.json(registros);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar el progreso",
      error: error.message,
    });
  }
};

// Todo el historial de progreso del jugador logueado, de todos sus planes
// juntos (para el gráfico general de progreso, no solo por plan).
const listarMiProgreso = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE usuario_id = ?", [usuarioId]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "No se encontró tu ficha de jugador" });
    }

    const [registros] = await db.query(
      `SELECT r.id, r.fecha, r.peso_kg, r.duracion_min, r.horario, r.observaciones
       FROM entrenamiento_extra_registros r
       JOIN planes_entrenamiento_extra p ON p.id = r.plan_id
       WHERE p.jugador_id = ?
       ORDER BY r.fecha ASC, r.id ASC`,
      [jugadores[0].id]
    );

    res.json(registros);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar tu progreso",
      error: error.message,
    });
  }
};

// El jugador borra su propio registro (se equivocó al cargar); el cuerpo
// técnico también puede, por si hace falta moderar/corregir.
const eliminarRegistroProgreso = async (req, res) => {
  try {
    const { registroId } = req.params;
    const usuario = req.usuario;

    const [registros] = await db.query(
      `SELECT r.id, p.jugador_id
       FROM entrenamiento_extra_registros r
       JOIN planes_entrenamiento_extra p ON p.id = r.plan_id
       WHERE r.id = ?`,
      [registroId]
    );
    if (registros.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    if (!CUERPO_TECNICO.includes(usuario.rol)) {
      const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ? AND usuario_id = ?", [
        registros[0].jugador_id,
        usuario.id,
      ]);
      if (jugadores.length === 0) {
        return res.status(403).json({ message: "Este registro no te pertenece" });
      }
    }

    await db.query("DELETE FROM entrenamiento_extra_registros WHERE id = ?", [registroId]);
    res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar el registro",
      error: error.message,
    });
  }
};

module.exports = {
  crearPlanEntrenamientoExtra,
  listarPlanesEntrenamientoExtra,
  obtenerMisEntrenamientosExtra,
  obtenerArchivoPlanEntrenamientoExtra,
  eliminarPlanEntrenamientoExtra,
  agregarRegistroProgreso,
  listarRegistrosProgreso,
  listarMiProgreso,
  eliminarRegistroProgreso,
};
