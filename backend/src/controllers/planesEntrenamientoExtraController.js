const db = require("../config/db");
const { guardarArchivo, servirArchivo, eliminarArchivo } = require("../config/storage");

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

const obtenerArchivoPlanEntrenamientoExtra = async (req, res) => {
  try {
    const { planId } = req.params;

    const [planes] = await db.query(
      "SELECT archivo FROM planes_entrenamiento_extra WHERE id = ?",
      [planId]
    );

    if (planes.length === 0 || !planes[0].archivo) {
      return res.status(404).json({ message: "Archivo no encontrado" });
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

module.exports = {
  crearPlanEntrenamientoExtra,
  listarPlanesEntrenamientoExtra,
  obtenerArchivoPlanEntrenamientoExtra,
  eliminarPlanEntrenamientoExtra,
};
